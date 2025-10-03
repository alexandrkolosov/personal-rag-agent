// lib/perplexity.ts
// Direct API approach - proven to work reliably

import { searchCache } from './searchCache';
import { semanticCache } from './semanticCache';
import { perplexityThrottler } from './requestThrottler';

interface PerplexityConfig {
    apiKey: string;
    model?: 'sonar' | 'sonar-pro' | 'sonar-deep-research' | 'sonar-reasoning' | 'sonar-reasoning-pro';
    maxTokens?: number;
    useCache?: boolean;
}

interface SearchOptions {
    searchDomainFilter?: string[];
    returnImages?: boolean;
    returnRelated?: boolean;
    searchRecencyFilter?: 'day' | 'week' | 'month' | 'year';
    searchMode?: 'web' | 'academic' | 'sec';
    model?: 'sonar' | 'sonar-pro' | 'sonar-deep-research' | 'sonar-reasoning' | 'sonar-reasoning-pro';
    // Structured outputs support
    responseFormat?: {
        type: 'json_schema';
        json_schema: {
            name?: string;
            schema: Record<string, any>;
            strict?: boolean;
        };
    };
}

interface WebSource {
    title?: string;
    url?: string;
    snippet?: string;
}

export class PerplexityClient {
    private apiKey: string;
    private baseUrl = 'https://api.perplexity.ai';
    private defaultModel: string;
    private useCache: boolean;

    constructor(config: PerplexityConfig) {
        this.apiKey = config.apiKey || process.env.PERPLEXITY_API_KEY!;
        this.defaultModel = config.model || 'sonar-pro'; // Fast, reliable, good quality
        this.useCache = config.useCache ?? true; // Cache enabled by default
    }

    async search(query: string, options?: SearchOptions) {
        // IMPORTANT: For web searches, we DISABLE semantic caching because:
        // 1. Web data changes constantly - cached results become stale
        // 2. Entity queries need fresh results (e.g., "Колосов Александр" vs "Колосов Алексей")
        // 3. 95% similarity can match wrong entities

        // LAYER 1: Check exact match cache ONLY (fast, <1ms)
        // This is safe because it requires EXACT query match
        if (this.useCache) {
            const cacheKey = { query, options };
            const cached = searchCache.get(query, cacheKey);
            if (cached) {
                console.log('✅ Exact cache HIT - returning cached result');
                return cached;
            }
        }

        console.log('❌ Cache MISS - fetching fresh results from Perplexity');

        // SKIP LAYER 2 (Semantic Cache) for web searches
        // Semantic cache disabled to prevent stale/wrong results

        // LAYER 3: Execute actual API request with throttling
        const result = await perplexityThrottler.execute(async () => {
            return this.executeSearchWithRetry(query, options);
        });

        // Store in EXACT match cache only (not semantic cache)
        if (this.useCache) {
            const cacheKey = { query, options };
            searchCache.set(query, result, cacheKey);
        }

        return result;
    }

    private async executeSearchWithRetry(query: string, options?: SearchOptions, retryCount: number = 0): Promise<any> {
        // No retry - simple, direct call
        return await this.executeSearch(query, options, retryCount);
    }

    private async executeSearch(query: string, options?: SearchOptions, retryCount: number = 0) {
        try {
            // Always use sonar-pro: fast, reliable, good quality
            const model = options?.model || 'sonar-pro';

            console.log('🔍 Perplexity Search:');
            console.log('  Query:', query);
            console.log('  Model:', model);

            // Build request body
            const requestBody: any = {
                model,
                messages: [
                    {
                        role: 'system',
                        content: 'Be comprehensive and accurate.'
                    },
                    {
                        role: 'user',
                        content: query  // Send query exactly as provided
                    }
                ],
                temperature: 0.2,
                top_p: 0.9,
                return_images: options?.returnImages ?? false,
                return_related_questions: options?.returnRelated ?? true,
            };

            // Add search mode if specified
            if (options?.searchMode) {
                requestBody.search_mode = options.searchMode;
            }

            // Add recency filter if specified
            if (options?.searchRecencyFilter) {
                requestBody.search_recency_filter = options.searchRecencyFilter;
            }

            // Add domain filter if specified
            if (options?.searchDomainFilter && options.searchDomainFilter.length > 0) {
                requestBody.search_domain_filter = options.searchDomainFilter;
            }

            // Add structured output format if specified
            if (options?.responseFormat) {
                requestBody.response_format = options.responseFormat;
                console.log('📋 Using structured output:', options.responseFormat.json_schema.name);
            }

            // Simple 30 second timeout
            const timeoutDuration = 30000;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

            try {
                const response = await fetch(`${this.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Perplexity error:', errorText);

                    // Parse error to provide better messages
                    let errorMessage = `Perplexity API error: ${response.status}`;
                    try {
                        const errorData = JSON.parse(errorText);
                        if (errorData.error?.message) {
                            errorMessage = errorData.error.message;
                        }
                    } catch (e) {
                        // Use default error message if parsing fails
                    }

                    // Handle rate limit specifically
                    if (response.status === 429) {
                        throw new Error('Perplexity API rate limit exceeded. Please wait a moment before trying again.');
                    }

                    throw new Error(errorMessage);
                }

                const data = await response.json();

                console.log('✅ Perplexity response received');
                console.log('📊 Response check:');
                console.log('  - Has choices:', !!data.choices);
                console.log('  - Has citations:', !!data.citations);
                console.log('  - Citations count:', data.citations?.length || 0);
                console.log('  - Has images:', !!data.images);
                console.log('  - Has related_questions:', !!data.related_questions);

                // Extract comprehensive metadata
                const message = data.choices?.[0]?.message;

                if (!message?.content) {
                    console.warn('⚠️ No message content in response!');
                }

                // Perplexity API returns citations as an array of URL strings
                let citations = data.citations || [];

                // Parse sources - Perplexity returns plain URLs
                const sources: WebSource[] = citations
                    .filter((citation: any) => citation) // Filter out null/undefined
                    .map((url: string, index: number) => {
                        if (typeof url === 'string' && url.startsWith('http')) {
                            try {
                                const urlObj = new URL(url);
                                const hostname = urlObj.hostname.replace('www.', '');

                                // Create a readable title from hostname
                                const title = hostname
                                    .split('.')
                                    .slice(0, -1)
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ') || hostname;

                                return {
                                    title: title,
                                    url: url,
                                    snippet: '' // Perplexity doesn't provide snippets in citations
                                };
                            } catch (e) {
                                console.error('Error parsing citation URL:', url, e);
                                return null;
                            }
                        }
                        return null;
                    })
                    .filter((source: WebSource | null): source is WebSource => source !== null && !!source.url);

                console.log('✅ Parsed', sources.length, 'sources');

                const result = {
                    answer: message?.content || '',
                    sources,
                    images: data.images || [],
                    relatedQuestions: data.related_questions || [],
                    model: requestBody.model,
                    usage: data.usage || {}
                };

                // Note: Caching happens in the search() method, not here
                // This avoids duplicate cache writes

                return result;

            } catch (fetchError: any) {
                clearTimeout(timeoutId);

                // Handle timeout specifically
                if (fetchError.name === 'AbortError') {
                    console.warn(`⏱️ Perplexity API timeout for query: "${query.substring(0, 50)}..."`);
                    throw new Error('TIMEOUT');
                }
                throw fetchError;
            }
        } catch (error) {
            console.error('❌ Perplexity search error:', error);
            throw error;
        }
    }
}

// Smart detection функция
export function shouldSearchWeb(
    question: string,
    documentContext: any[],
    forceSearch: boolean = false
): boolean {
    // Если форсированный поиск - всегда используем
    if (forceSearch) return true;

    const lowerQ = question.toLowerCase();

    // Паттерны, требующие веб-поиска
    const webPatterns = [
        /последн(ие|ий|яя|ее) новост/i,
        /текущ(ий|ая|ее|ие)/i,
        /сегодня|вчера|на этой неделе/i,
        /актуальн(ый|ая|ое|ые)/i,
        /современн(ый|ая|ое|ые)/i,
        /тренд(ы|ов)/i,
        /прогноз на/i,
        /что происходит с/i,
        /конкурент(ы|ов|ами)/i,
        /рыночн(ые|ая) (цен|стоимост|ставк)/i,
        /курс (валют|доллара|евро)/i,
        /законодательств|регулирован/i,
        /(сравни|compare).*(рынк|market|индустр|industry)/i
    ];

    // Проверяем паттерны
    const needsWeb = webPatterns.some(pattern => pattern.test(lowerQ));

    // Проверяем качество документального контекста
    const hasGoodDocContext = documentContext.some(d => d.similarity > 0.75);
    const avgSimilarity = documentContext.reduce((sum, d) => sum + d.similarity, 0) / (documentContext.length || 1);

    // Логика принятия решения
    return needsWeb || (!hasGoodDocContext && avgSimilarity < 0.5);
}

/**
 * Enrich context with web search using Perplexity API
 * Supports grounded search with citations and structured outputs
 */
export async function enrichWithWebSearch(
    question: string,
    documentContext: any[],
    options?: SearchOptions & { role?: string; useStructuredOutput?: boolean }
): Promise<any> {
    // Выбираем модель в зависимости от роли
    const modelForRole = selectModelForRole(options?.role);

    const client = new PerplexityClient({
        apiKey: process.env.PERPLEXITY_API_KEY!,
        model: modelForRole,
        useCache: true  // Enable caching
    });

    // Формируем контекстный запрос с учетом контекста документов
    let contextualQuery = question;

    if (documentContext.length > 0) {
        const topics = extractTopics(documentContext);
        if (topics.length > 0) {
            contextualQuery = `${question}\n\nContext: Analysis related to ${topics.join(', ')}.`;
        }
    }

    // Выполняем поиск с расширенными параметрами
    const searchOptions: SearchOptions = {
        ...options,
        returnImages: options?.returnImages ?? true,
        returnRelated: options?.returnRelated ?? true,
        model: modelForRole
    };

    // Add structured output if requested
    if (options?.useStructuredOutput && options?.responseFormat) {
        console.log('📋 Using structured output with schema:', options.responseFormat.json_schema.name);
    }

    const webResults = await client.search(contextualQuery, searchOptions);

    return {
        webAnswer: webResults.answer,
        webSources: webResults.sources,
        webImages: webResults.images || [],
        relatedQuestions: webResults.relatedQuestions || [],
        combinedContext: mergeContexts(documentContext, webResults),
        confidence: calculateCombinedConfidence(documentContext, webResults),
        model: webResults.model,
        usage: webResults.usage
    };
}

// Model fallback chain - from slowest to fastest
const MODEL_FALLBACK_CHAIN = [
    'sonar-pro',           // Fast, good quality
    'sonar'                // Fastest fallback
] as const;

// Выбор модели в зависимости от роли AI
function selectModelForRole(role?: string, useFastModel: boolean = false): 'sonar' | 'sonar-pro' | 'sonar-deep-research' | 'sonar-reasoning' | 'sonar-reasoning-pro' {
    // If fast model requested (e.g., after timeout), use sonar as fallback
    if (useFastModel) {
        return 'sonar';
    }

    // Default to sonar-pro for good balance of speed and quality
    if (!role) return 'sonar-pro';

    const roleLower = role.toLowerCase();

    // Use higher quality models for roles that need deep analysis
    // These roles benefit from better reasoning even if slightly slower
    if (roleLower.includes('analyst') ||
        roleLower.includes('researcher') ||
        roleLower.includes('consultant') ||
        roleLower.includes('strategist')) {
        return 'sonar-reasoning'; // Better quality for analytical roles
    }

    // Use faster model for general queries
    return 'sonar-pro';
}

function extractTopics(context: any[]): string[] {
    // Извлекаем ключевые темы из контекста
    const topics = new Set<string>();
    context.forEach(chunk => {
        // Простая эвристика - можно улучшить с NLP
        const matches = chunk.text.match(/[A-Z][a-z]+ [A-Z][a-z]+/g) || [];
        matches.forEach((m: string) => topics.add(m));
    });
    return Array.from(topics).slice(0, 5);
}

function mergeContexts(docContext: any[], webResults: any): string {
    return `
DOCUMENT CONTEXT:
${docContext.map(d => d.text).join('\n')}

WEB CONTEXT (Real-time):
${webResults.answer}

SOURCES:
${webResults.sources.map((s: any) => `- ${s.url}`).join('\n')}
  `;
}

function calculateCombinedConfidence(docContext: any[], webResults: any): number {
    const docConfidence = Math.max(...docContext.map(d => d.similarity), 0);
    const webConfidence = webResults.sources?.length > 0 ? 0.8 : 0.5;
    return Math.max(docConfidence, webConfidence);
}