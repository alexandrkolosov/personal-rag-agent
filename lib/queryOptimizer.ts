// lib/queryOptimizer.ts
// AI-powered query optimization and decomposition

import { chatWithProvider } from './modelProvider';

export interface OptimizedQuery {
    original: string;
    subQueries: SubQuery[];
    searchStrategy: 'comprehensive' | 'focused' | 'comparative' | 'temporal';
    expectedSources: string[];
}

export interface SubQuery {
    query: string;
    purpose: string;
    priority: 'high' | 'medium' | 'low';
    searchMode?: 'web' | 'academic' | 'sec';
    domainHints?: string[];
}

const QUERY_OPTIMIZER_PROMPT = `You are a query optimization expert. Break down user questions into targeted search queries using available context.

CRITICAL RULES:
1. Generate 2-3 FOCUSED sub-queries (not 5+ broad ones)
2. Use specific context from the question (company names, locations, dates, identifiers)
3. Each sub-query must be SPECIFIC and include context markers
4. Keep the same language as the original question (Russian/English)
5. Avoid generic searches - make them targeted

CONTEXT ENRICHMENT:
- If question mentions companies → include company names in sub-queries
- If question mentions locations → include specific locations
- If question mentions dates/periods → include time context
- If question has identifiers → use them in searches

EXAMPLES:

Bad (too broad):
Original: "Compare SwiftDrive and YoYo Mobility"
❌ "electric vehicle market"
❌ "mobility companies"
❌ "transportation trends"

Good (specific with context):
Original: "Compare SwiftDrive and YoYo Mobility"
✅ "SwiftDrive business model Russia 2024"
✅ "YoYo Mobility France operations OTK"

Bad (too many, too general):
Original: "Какие риски в крипторынке?"
❌ 5 queries: "crypto news", "crypto risks", "crypto market", "crypto regulation", "crypto trends"

Good (focused):
Original: "Какие риски в крипторынке?"
✅ 2-3 queries: "основные риски криптовалют 2024", "регулирование криптовалют"

OUTPUT FORMAT - Return ONLY this JSON structure without any markdown:
{
  "subQueries": [
    {
      "query": "specific different search query in same language",
      "purpose": "what aspect this covers",
      "priority": "high",
      "searchMode": "web",
      "domainHints": ["relevant-domain.com"]
    }
  ],
  "searchStrategy": "comprehensive",
  "expectedSources": ["news", "research"],
  "synthesisHints": "how to combine"
}

IMPORTANT: Return ONLY valid JSON without code blocks or markdown formatting.`;

export async function optimizeQuery(
    userQuery: string,
    role?: string,
    documentContext?: any[],
    additionalContext?: Record<string, string>,
    maxSubQueries?: number  // NEW: Limit sub-queries for cost control
): Promise<OptimizedQuery> {
    console.log('🔍 Optimizing query:', userQuery);
    if (maxSubQueries) {
        console.log(`💰 Max sub-queries limited to: ${maxSubQueries} (cost optimization)`);
    }

    // Extract context from additionalContext if provided
    let contextEnrichment = '';
    if (additionalContext && Object.keys(additionalContext).length > 0) {
        contextEnrichment = '\n\nADDITIONAL CONTEXT PROVIDED BY USER:\n';
        for (const [key, value] of Object.entries(additionalContext)) {
            contextEnrichment += `${key}: ${value}\n`;
        }
        contextEnrichment += '\nUSE THIS CONTEXT IN YOUR SUB-QUERIES!\n';
    }

    const contextInfo = documentContext?.length
        ? `\nAvailable document context: ${documentContext.length} documents with topics related to the question.`
        : '\nNo specific document context available.';

    const roleContext = role
        ? `\nUser role: ${role} - optimize for ${role} perspective`
        : '';

    // Add max sub-queries constraint if provided
    const maxQueriesConstraint = maxSubQueries
        ? `\n\nIMPORTANT: Generate MAXIMUM ${maxSubQueries} sub-queries (cost optimization).`
        : '';

    const optimizerPrompt = `${QUERY_OPTIMIZER_PROMPT}

USER QUESTION:
"${userQuery}"
${contextInfo}${roleContext}${contextEnrichment}${maxQueriesConstraint}

YOUR TASK:
1. Extract specific context (companies, locations, dates, identifiers) from the question
2. Generate ${maxSubQueries ? `MAXIMUM ${maxSubQueries}` : '2-3'} FOCUSED queries
3. Include extracted context in EVERY sub-query
4. Make queries specific and targeted
5. Use the same language as the original question

Context extraction:
- Companies mentioned → include in queries
- Locations mentioned → include in queries
- Dates/periods → include in queries
- Specific identifiers → include in queries

Now break down the user's question into sub-queries following this approach.`;

    try {
        const response = await chatWithProvider('openai', {
            system: 'You are a query optimization expert. Always return ONLY valid JSON without markdown formatting or code blocks.',
            user: optimizerPrompt,
            maxTokens: 1500
        });

        // Clean response - remove markdown code blocks if present
        let cleanedResponse = response.trim();

        // Remove ```json and ``` markers
        cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '');
        cleanedResponse = cleanedResponse.replace(/```\s*/g, '');

        // Find first { and last }
        const firstBrace = cleanedResponse.indexOf('{');
        const lastBrace = cleanedResponse.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
        }

        console.log('Raw response:', response.substring(0, 200));
        console.log('Cleaned response:', cleanedResponse.substring(0, 200));

        // Parse response
        const parsed = JSON.parse(cleanedResponse);

        // Validate parsed response
        if (!parsed.subQueries || !Array.isArray(parsed.subQueries) || parsed.subQueries.length === 0) {
            console.warn('Invalid subQueries in response, using fallback');
            throw new Error('No valid sub-queries generated');
        }

        // Filter out sub-queries that are identical or too similar to original
        // But ALLOW queries that add context/specificity
        const validSubQueries = parsed.subQueries.filter((sq: SubQuery) => {
            if (!sq.query || sq.query.length < 5) {
                console.warn(`Filtered out invalid sub-query: ${sq.query}`);
                return false;
            }

            const sqLower = sq.query.toLowerCase().trim();
            const originalLower = userQuery.toLowerCase().trim();

            // Reject if identical
            if (sqLower === originalLower) {
                console.warn(`Filtered out identical sub-query: ${sq.query}`);
                return false;
            }

            // Reject if sub-query is just the original with minor additions
            // Calculate similarity ratio - if too high (>90%), probably not different enough
            const longerLength = Math.max(sqLower.length, originalLower.length);
            const shorterLength = Math.min(sqLower.length, originalLower.length);

            // If queries are similar length and one contains the other exactly, check if meaningful additions
            if (sqLower.includes(originalLower) || originalLower.includes(sqLower)) {
                const lengthRatio = shorterLength / longerLength;
                if (lengthRatio > 0.9) {
                    // Almost identical length - probably just punctuation difference
                    console.warn(`Filtered out near-duplicate sub-query: ${sq.query}`);
                    return false;
                }
                // If sub-query is significantly longer (added context), it's valid
                if (sqLower.length > originalLower.length * 1.3) {
                    console.log(`✅ Accepted enriched sub-query: ${sq.query}`);
                    return true;
                }
            }

            return true;
        });

        // If all queries were filtered, use fallback
        if (validSubQueries.length === 0) {
            console.warn('All sub-queries were invalid/duplicates, using fallback');
            throw new Error('No valid distinct sub-queries');
        }

        const optimized: OptimizedQuery = {
            original: userQuery,
            subQueries: validSubQueries,
            searchStrategy: parsed.searchStrategy || 'comprehensive',
            expectedSources: parsed.expectedSources || []
        };

        console.log(`✅ Generated ${optimized.subQueries.length} sub-queries`);
        optimized.subQueries.forEach((sq, i) => {
            console.log(`   ${i + 1}. [${sq.priority}] ${sq.query}`);
        });

        return optimized;

    } catch (error) {
        console.error('Query optimization failed, using fallback:', error);

        // Fallback: return original query
        return {
            original: userQuery,
            subQueries: [{
                query: userQuery,
                purpose: 'Direct search',
                priority: 'high',
                searchMode: 'web'
            }],
            searchStrategy: 'focused',
            expectedSources: ['general web sources']
        };
    }
}

// Синтез результатов из множественных поисков
export async function synthesizeSearchResults(
    originalQuery: string,
    subQueryResults: Array<{
        query: string;
        results: any;
    }>,
    documentContext: any[],
    role?: string
): Promise<string> {
    console.log('🔄 Synthesizing results from', subQueryResults.length, 'searches');

    const allSources: string[] = [];
    const allAnswers: string[] = [];

    subQueryResults.forEach(sqr => {
        if (sqr.results.webAnswer) {
            allAnswers.push(`### From query: "${sqr.query}"\n${sqr.results.webAnswer}`);
        }
        if (sqr.results.webSources) {
            sqr.results.webSources.forEach((src: any) => {
                if (src.url && !allSources.includes(src.url)) {
                    allSources.push(`${src.title}: ${src.url}`);
                }
            });
        }
    });

    const synthesisPrompt = `You are synthesizing information from multiple targeted searches to answer a complex question.

ORIGINAL QUESTION:
"${originalQuery}"

SEARCH RESULTS FROM MULTIPLE QUERIES:
${allAnswers.join('\n\n---\n\n')}

ALL SOURCES:
${allSources.join('\n')}

DOCUMENT CONTEXT:
${documentContext.length > 0 ? documentContext.map(d => d.text.substring(0, 500)).join('\n---\n') : 'No document context'}

YOUR TASK:
1. Synthesize all the information into a comprehensive answer
2. Identify common themes and contradictions
3. Provide a balanced perspective using all sources
4. Note areas of uncertainty or conflicting information
5. Structure the answer logically with sections

${role ? `Apply your ${role} expertise and perspective.` : ''}

Return a comprehensive synthesized answer that combines insights from all searches.`;

    try {
        const synthesis = await chatWithProvider('anthropic', {
            system: 'You are an expert at synthesizing information from multiple sources into coherent, comprehensive answers.',
            user: synthesisPrompt,
            maxTokens: 4000
        });

        console.log('✅ Synthesis complete:', synthesis.substring(0, 100) + '...');
        return synthesis;

    } catch (error) {
        console.error('Synthesis failed:', error);
        // Fallback: concatenate results
        return allAnswers.join('\n\n---\n\n');
    }
}
