// lib/documentComparator.ts
// Semantic document comparison with AI-powered analysis

import { createClient } from '@supabase/supabase-js';
import { chatWithProvider } from './modelProvider';

export interface ComparisonResult {
    comparisonId: string;
    documents: DocumentInfo[];
    differences: Difference[];
    similarities: Similarity[];
    summary: string;
    recommendations?: string[];
    comparisonType: 'semantic' | 'ai_powered';
    metadata: {
        totalDifferences: number;
        criticalDifferences: number;
        similarityScore: number;
        executionTime: number;
    };
}

export interface DocumentInfo {
    id: string;
    filename: string;
    docType: string;
    sectionsCount: number;
    chunksCount: number;
}

export interface Difference {
    type: 'clause_missing' | 'value_different' | 'term_changed' | 'structure_different';
    severity: 'critical' | 'major' | 'minor';
    location: {
        document1?: string; // section or clause reference
        document2?: string;
    };
    description: string;
    content1?: string;
    content2?: string;
}

export interface Similarity {
    type: 'identical_clause' | 'similar_terms' | 'shared_structure';
    location: string;
    description: string;
    similarityScore: number;
}

/**
 * Compare documents using quick semantic similarity
 */
export async function compareDocumentsSemanticQuick(
    documentIds: string[],
    userId: string,
    projectId?: string
): Promise<ComparisonResult> {
    const startTime = Date.now();

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch documents with chunks
    const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*, doc_chunks(*)')
        .in('id', documentIds)
        .eq('user_id', userId);

    if (docsError || !documents || documents.length < 2) {
        throw new Error('Failed to fetch documents for comparison');
    }

    // Build document info
    const docInfos: DocumentInfo[] = documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        docType: doc.doc_type || 'general',
        sectionsCount: doc.metadata?.sections?.length || 0,
        chunksCount: doc.doc_chunks?.length || 0
    }));

    // Quick semantic comparison: compare chunk embeddings
    const differences: Difference[] = [];
    const similarities: Similarity[] = [];

    // Compare chunks from doc1 to doc2
    const doc1Chunks = documents[0].doc_chunks || [];
    const doc2Chunks = documents[1].doc_chunks || [];

    // Find missing clauses (chunks that don't have similar counterparts)
    for (const chunk1 of doc1Chunks) {
        const metadata1 = chunk1.metadata || {};
        const clause1 = metadata1.clause_number || `Chunk ${chunk1.chunk_index}`;

        // Find most similar chunk in doc2 using cosine similarity
        let maxSimilarity = 0;
        let mostSimilarChunk = null;

        for (const chunk2 of doc2Chunks) {
            const similarity = cosineSimilarity(chunk1.embedding, chunk2.embedding);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                mostSimilarChunk = chunk2;
            }
        }

        if (maxSimilarity < 0.7) {
            // Clause missing or very different
            differences.push({
                type: 'clause_missing',
                severity: 'major',
                location: {
                    document1: clause1,
                    document2: undefined
                },
                description: `Clause "${clause1}" from ${documents[0].filename} not found in ${documents[1].filename}`,
                content1: chunk1.chunk_text.substring(0, 200)
            });
        } else if (maxSimilarity > 0.95) {
            // Highly similar
            similarities.push({
                type: 'identical_clause',
                location: clause1,
                description: `Clause "${clause1}" is nearly identical in both documents`,
                similarityScore: maxSimilarity
            });
        } else if (maxSimilarity >= 0.7 && maxSimilarity <= 0.95) {
            // Similar but with differences
            const metadata2 = mostSimilarChunk?.metadata || {};
            const clause2 = metadata2.clause_number || `Chunk ${mostSimilarChunk?.chunk_index}`;

            differences.push({
                type: 'term_changed',
                severity: 'minor',
                location: {
                    document1: clause1,
                    document2: clause2
                },
                description: `Clause "${clause1}" has minor differences`,
                content1: chunk1.chunk_text.substring(0, 200),
                content2: mostSimilarChunk?.chunk_text.substring(0, 200)
            });
        }
    }

    // Check for chunks in doc2 that don't exist in doc1
    for (const chunk2 of doc2Chunks) {
        let maxSimilarity = 0;
        for (const chunk1 of doc1Chunks) {
            const similarity = cosineSimilarity(chunk1.embedding, chunk2.embedding);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
            }
        }

        if (maxSimilarity < 0.7) {
            const metadata2 = chunk2.metadata || {};
            const clause2 = metadata2.clause_number || `Chunk ${chunk2.chunk_index}`;

            differences.push({
                type: 'clause_missing',
                severity: 'major',
                location: {
                    document1: undefined,
                    document2: clause2
                },
                description: `Clause "${clause2}" from ${documents[1].filename} not found in ${documents[0].filename}`,
                content2: chunk2.chunk_text.substring(0, 200)
            });
        }
    }

    // Calculate overall similarity score
    const totalChunks = doc1Chunks.length + doc2Chunks.length;
    const similarChunks = similarities.length * 2; // Count for both docs
    const similarityScore = totalChunks > 0 ? (similarChunks / totalChunks) : 0;

    const summary = `Found ${differences.length} differences and ${similarities.length} similarities. Overall similarity: ${(similarityScore * 100).toFixed(1)}%`;

    const executionTime = Date.now() - startTime;

    // Save comparison result
    const comparisonResult: ComparisonResult = {
        comparisonId: '', // Will be set after DB insert
        documents: docInfos,
        differences,
        similarities,
        summary,
        comparisonType: 'semantic',
        metadata: {
            totalDifferences: differences.length,
            criticalDifferences: differences.filter(d => d.severity === 'critical').length,
            similarityScore,
            executionTime
        }
    };

    return comparisonResult;
}

/**
 * Compare documents using AI-powered deep analysis
 */
export async function compareDocumentsAIPowered(
    documentIds: string[],
    userId: string,
    projectId?: string
): Promise<ComparisonResult> {
    const startTime = Date.now();

    // First, get quick semantic comparison
    const quickComparison = await compareDocumentsSemanticQuick(documentIds, userId, projectId);

    // Now use AI to analyze differences in detail
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: documents } = await supabase
        .from('documents')
        .select('*, doc_chunks(*)')
        .in('id', documentIds)
        .eq('user_id', userId);

    if (!documents || documents.length < 2) {
        throw new Error('Documents not found');
    }

    // Prepare comparison prompt
    const doc1Summary = `Document 1: ${documents[0].filename}
Type: ${documents[0].doc_type}
Sections: ${documents[0].metadata?.sections?.join(', ') || 'None'}
Key Terms: ${documents[0].metadata?.keyTerms?.slice(0, 10).join(', ') || 'None'}`;

    const doc2Summary = `Document 2: ${documents[1].filename}
Type: ${documents[1].doc_type}
Sections: ${documents[1].metadata?.sections?.join(', ') || 'None'}
Key Terms: ${documents[1].metadata?.keyTerms?.slice(0, 10).join(', ') || 'None'}`;

    // Get key differences for AI analysis
    const topDifferences = quickComparison.differences
        .filter(d => d.severity === 'critical' || d.severity === 'major')
        .slice(0, 10);

    const differencesText = topDifferences.map((diff, i) => `
${i + 1}. ${diff.description}
   - Document 1: ${diff.content1?.substring(0, 300) || 'N/A'}
   - Document 2: ${diff.content2?.substring(0, 300) || 'N/A'}
`).join('\n');

    const aiPrompt = `You are a legal document analysis expert. Compare these two documents and provide detailed insights.
Documents may be in Russian or English - analyze them in the language they are written in.

${doc1Summary}

${doc2Summary}

KEY DIFFERENCES FOUND:
${differencesText}

YOUR TASK:
1. Analyze the critical differences between these documents
2. Identify any legal risks or compliance issues
3. Determine if these are different versions of the same agreement or completely different documents
4. Provide specific recommendations for reconciliation or action
5. Highlight any missing critical clauses (payment terms, liability, termination, etc.)
6. If documents are in Russian, provide your analysis in Russian; if in English, use English

Return your analysis in the following JSON format:
{
  "summary": "Brief overview of comparison in document language (2-3 sentences)",
  "criticalFindings": [
    {
      "type": "risk|missing_clause|value_change|other",
      "description": "What was found (in document language)",
      "severity": "critical|major|minor",
      "recommendation": "What to do about it (in document language)"
    }
  ],
  "documentRelationship": "same_document_versions|different_agreements|similar_templates|unrelated",
  "recommendations": ["action item 1 (in document language)", "action item 2"]
}`;

    try {
        const aiResponse = await chatWithProvider('anthropic', {
            system: 'You are a legal document comparison expert fluent in Russian and English. Always return valid JSON. When documents are in Russian, provide analysis in Russian; when in English, use English.',
            user: aiPrompt,
            maxTokens: 3000
        });

        // Parse AI response
        let cleanedResponse = aiResponse.trim();
        cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '');
        cleanedResponse = cleanedResponse.replace(/```\s*/g, '');

        const firstBrace = cleanedResponse.indexOf('{');
        const lastBrace = cleanedResponse.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
        }

        const aiAnalysis = JSON.parse(cleanedResponse);

        // Enhance differences with AI findings
        const enhancedDifferences = [...quickComparison.differences];

        if (aiAnalysis.criticalFindings) {
            for (const finding of aiAnalysis.criticalFindings) {
                enhancedDifferences.push({
                    type: finding.type === 'missing_clause' ? 'clause_missing' : 'value_different',
                    severity: finding.severity,
                    location: { document1: 'AI Analysis', document2: 'AI Analysis' },
                    description: finding.description,
                    content1: finding.recommendation
                });
            }
        }

        const executionTime = Date.now() - startTime;

        return {
            ...quickComparison,
            differences: enhancedDifferences,
            summary: aiAnalysis.summary || quickComparison.summary,
            recommendations: aiAnalysis.recommendations,
            comparisonType: 'ai_powered',
            metadata: {
                ...quickComparison.metadata,
                executionTime,
                criticalDifferences: enhancedDifferences.filter(d => d.severity === 'critical').length
            }
        };

    } catch (error) {
        console.error('AI analysis failed, returning semantic comparison:', error);
        return {
            ...quickComparison,
            comparisonType: 'ai_powered',
            metadata: {
                ...quickComparison.metadata,
                executionTime: Date.now() - startTime
            }
        };
    }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) {
        return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        norm1 += vec1[i] * vec1[i];
        norm2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Save comparison result to database
 */
export async function saveComparisonResult(
    comparison: ComparisonResult,
    userId: string,
    projectId?: string
): Promise<string> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
        .from('document_comparisons')
        .insert({
            user_id: userId,
            project_id: projectId || null,
            document_ids: comparison.documents.map(d => d.id),
            comparison_type: comparison.comparisonType,
            results: {
                differences: comparison.differences,
                similarities: comparison.similarities,
                summary: comparison.summary,
                recommendations: comparison.recommendations,
                metadata: comparison.metadata
            }
        })
        .select('id')
        .single();

    if (error) {
        console.error('Failed to save comparison:', error);
        throw error;
    }

    return data.id;
}
