// lib/perplexity.ts

interface PerplexityConfig {
    apiKey: string;
    model?: string;
    maxTokens?: number;
}

interface SearchOptions {
    searchDomainFilter?: string[];
    returnImages?: boolean;
    returnRelated?: boolean;
    searchRecencyFilter?: 'day' | 'week' | 'month' | 'year';
}

export class PerplexityClient {
    private apiKey: string;
    private baseUrl = 'https://api.perplexity.ai';

    constructor(config: PerplexityConfig) {
        this.apiKey = config.apiKey || process.env.PERPLEXITY_API_KEY!;
    }

    async search(query: string, options?: SearchOptions) {
        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'sonar-medium-online',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful search assistant. Provide accurate, up-to-date information with sources.'
                        },
                        {
                            role: 'user',
                            content: query
                        }
                    ],
                    temperature: 0.2,
                    top_p: 0.9,
                    search_domain_filter: options?.searchDomainFilter,
                    return_images: options?.returnImages || false,
                    return_related_questions: options?.returnRelated || false,
                    search_recency_filter: options?.searchRecencyFilter
                })
            });

            if (!response.ok) {
                throw new Error(`Perplexity API error: ${response.status}`);
            }

            const data = await response.json();

            return {
                answer: data.choices[0].message.content,
                sources: data.sources || [],
                images: data.images || [],
                relatedQuestions: data.related_questions || []
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
    options?: SearchOptions
): Promise<any> {
    const client = new PerplexityClient({
        apiKey: process.env.PERPLEXITY_API_KEY!
    });

    // Формируем контекстный запрос
    const contextualQuery = `${question}. Context: Working with documents about ${extractTopics(documentContext).join(', ')}.`;

    const webResults = await client.search(contextualQuery, options);

    return {
        webAnswer: webResults.answer,
        webSources: webResults.sources,
        combinedContext: mergeContexts(documentContext, webResults),
        confidence: calculateCombinedConfidence(documentContext, webResults)
    };
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