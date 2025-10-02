// lib/perplexity.ts

interface PerplexityConfig {
    apiKey: string;
    model?: 'sonar' | 'sonar-pro' | 'sonar-deep-research' | 'sonar-reasoning' | 'sonar-reasoning-pro';
    maxTokens?: number;
}

interface SearchOptions {
    searchDomainFilter?: string[];
    returnImages?: boolean;
    returnRelated?: boolean;
    searchRecencyFilter?: 'day' | 'week' | 'month' | 'year';
    searchMode?: 'web' | 'academic' | 'sec';
    model?: 'sonar' | 'sonar-pro' | 'sonar-deep-research' | 'sonar-reasoning' | 'sonar-reasoning-pro';
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

    constructor(config: PerplexityConfig) {
        this.apiKey = config.apiKey || process.env.PERPLEXITY_API_KEY!;
        this.defaultModel = config.model || 'sonar-deep-research';
    }

    async search(query: string, options?: SearchOptions) {
        try {
            const requestBody: any = {
                model: options?.model || this.defaultModel,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful search assistant. Provide accurate, up-to-date information with detailed sources and citations.'
                    },
                    {
                        role: 'user',
                        content: query
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

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Perplexity error:', errorText);
                throw new Error(`Perplexity API error: ${response.status}`);
            }

            const data = await response.json();

            console.log('Perplexity raw response:', JSON.stringify(data, null, 2));

            // Extract comprehensive metadata
            const message = data.choices?.[0]?.message;

            // Perplexity API returns citations as an array of URL strings
            // Format: ["https://example.com", "https://example2.com"]
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
                .filter((source): source is WebSource => source !== null && !!source.url);

            console.log('Parsed sources:', sources);

            return {
                answer: message?.content || '',
                sources,
                images: data.images || [],
                relatedQuestions: data.related_questions || [],
                model: requestBody.model,
                usage: data.usage || {}
            };
        } catch (error) {
            console.error('Perplexity search error:', error);
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

// Функция объединения контекстов
export async function enrichWithWebSearch(
    question: string,
    documentContext: any[],
    options?: SearchOptions & { role?: string }
): Promise<any> {
    // Выбираем модель в зависимости от роли
    const modelForRole = selectModelForRole(options?.role);

    const client = new PerplexityClient({
        apiKey: process.env.PERPLEXITY_API_KEY!,
        model: modelForRole
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

// Выбор модели в зависимости от роли AI
function selectModelForRole(role?: string): 'sonar' | 'sonar-pro' | 'sonar-deep-research' | 'sonar-reasoning' | 'sonar-reasoning-pro' {
    if (!role) return 'sonar-deep-research';

    const roleLower = role.toLowerCase();

    // CFO, Analyst, Lawyer требуют глубокого анализа
    if (roleLower.includes('cfo') || roleLower.includes('analyst') || roleLower.includes('lawyer')) {
        return 'sonar-deep-research';
    }

    // Investor требует reasoning для оценки потенциала
    if (roleLower.includes('investor')) {
        return 'sonar-reasoning-pro';
    }

    // По умолчанию используем deep research
    return 'sonar-deep-research';
}

function extractTopics(context: any[]): string[] {
    // Извлекаем ключевые темы из контекста
    const topics = new Set<string>();
    context.forEach(chunk => {
        // Простая эвристика - можно улучшить с NLP
        const matches = chunk.text.match(/[A-Z][a-z]+ [A-Z][a-z]+/g) || [];
        matches.forEach(m => topics.add(m));
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