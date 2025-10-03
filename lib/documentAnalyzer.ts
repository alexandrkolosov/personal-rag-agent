// lib/documentAnalyzer.ts
// Document type detection and analysis for smart embedding selection

export type DocumentType = 'agreement' | 'contract' | 'legal' | 'general';
export type EmbeddingModel = 'text-embedding-3-large' | 'text-embedding-3-small';

export interface DocumentAnalysis {
    docType: DocumentType;
    confidence: number;
    embeddingModel: EmbeddingModel;
    entities: {
        parties?: string[];
        dates?: string[];
        amounts?: string[];
        references?: string[];
    };
    sections: string[];
    keyTerms: string[];
}

// Legal keywords for document type detection (Russian and English)
const LEGAL_KEYWORDS = {
    agreement: [
        'соглашение', 'agreement', 'договор', 'между', 'between', 'сторонами', 'parties',
        'заключили', 'настоящее соглашение', 'hereby agree', 'this agreement',
        'агентский договор', 'агентское соглашение', 'agency agreement',
        'стороны договорились', 'сторона первая', 'сторона вторая', 'заключен',
        'подписали', 'подписан', 'signed by', 'executed by'
    ],
    contract: [
        'контракт', 'contract', 'обязательства', 'obligations', 'исполнение', 'performance',
        'условия контракта', 'terms of contract', 'предмет договора', 'subject matter',
        'договор подряда', 'договор поставки', 'supply contract',
        'исполнитель', 'заказчик', 'подрядчик', 'поставщик', 'покупатель',
        'contractor', 'customer', 'supplier', 'buyer', 'seller',
        'срок исполнения', 'стоимость работ', 'оплата', 'payment terms'
    ],
    legal: [
        'закон', 'law', 'статья', 'article', 'пункт', 'clause', 'параграф', 'paragraph',
        'нормативный акт', 'legal act', 'постановление', 'regulation', 'кодекс', 'code',
        'юрисдикция', 'jurisdiction', 'истец', 'ответчик', 'plaintiff', 'defendant',
        'гражданский кодекс', 'уголовный кодекс', 'налоговый кодекс',
        'federal law', 'civil code', 'criminal code', 'tax code',
        'в соответствии с', 'на основании', 'согласно', 'pursuant to', 'in accordance with',
        'ответственность', 'liability', 'штраф', 'penalty', 'санкции', 'sanctions'
    ]
};

// Section markers for legal documents
const SECTION_MARKERS = [
    'раздел', 'section', 'глава', 'chapter', 'статья', 'article',
    'пункт', 'paragraph', 'clause', 'подпункт', 'subclause',
    'приложение', 'appendix', 'exhibit', 'schedule'
];

/**
 * Detects document type based on content analysis
 */
export function detectDocumentType(text: string): DocumentType {
    const lowerText = text.toLowerCase();
    const scores = {
        agreement: 0,
        contract: 0,
        legal: 0,
        general: 0
    };

    // Count keyword occurrences
    for (const [type, keywords] of Object.entries(LEGAL_KEYWORDS)) {
        for (const keyword of keywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = lowerText.match(regex);
            if (matches) {
                scores[type as keyof typeof scores] += matches.length;
            }
        }
    }

    // Check for structural markers (numbered clauses, sections)
    const hasNumberedClauses = /\d+\.\d+/.test(text); // e.g., "1.1", "2.3"
    const hasSections = SECTION_MARKERS.some(marker =>
        new RegExp(`\\b${marker}\\s+\\d+`, 'i').test(lowerText)
    );

    if (hasNumberedClauses || hasSections) {
        scores.legal += 5;
        scores.agreement += 3;
        scores.contract += 3;
    }

    // Check for signature blocks
    const hasSignatures = /подпись|signature|м\.п\.|seal/gi.test(lowerText);
    if (hasSignatures) {
        scores.agreement += 5;
        scores.contract += 5;
    }

    // Determine highest score
    const maxScore = Math.max(...Object.values(scores));

    if (maxScore < 3) {
        return 'general'; // Too few legal indicators
    }

    const detectedType = Object.entries(scores)
        .find(([_, score]) => score === maxScore)?.[0] as DocumentType;

    return detectedType || 'general';
}

/**
 * Selects appropriate embedding model based on document type
 */
export function selectEmbeddingModel(docType: DocumentType): EmbeddingModel {
    // Use large model for legal documents (higher precision needed)
    // text-embedding-3-large: 3072 dimensions, better for complex legal text
    // text-embedding-3-small: 1536 dimensions, faster and cheaper for general documents
    if (docType === 'agreement' || docType === 'contract' || docType === 'legal') {
        return 'text-embedding-3-large';
    }
    // Use small model for general documents
    return 'text-embedding-3-small';
}

/**
 * Extracts entities from document text
 */
export function extractEntities(text: string): DocumentAnalysis['entities'] {
    const entities: DocumentAnalysis['entities'] = {};

    // Extract dates (various formats)
    const datePatterns = [
        /\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4}/g, // 01.01.2024, 01/01/2024
        /\d{4}-\d{2}-\d{2}/g, // 2024-01-01
        /"\d{1,2}"\s+[а-яА-Я]+\s+\d{4}/g, // "01" января 2024
    ];

    const dates = new Set<string>();
    for (const pattern of datePatterns) {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(d => dates.add(d));
        }
    }
    if (dates.size > 0) {
        entities.dates = Array.from(dates).slice(0, 10); // Limit to 10 dates
    }

    // Extract amounts (money)
    const amountPatterns = [
        /\d+[\s,]?\d*\s*(?:руб\.|рублей|dollars?|usd|eur|€|\$)/gi,
        /\d+[\s,]?\d*\.\d{2}\s*(?:руб\.|рублей|dollars?|usd|eur)/gi,
    ];

    const amounts = new Set<string>();
    for (const pattern of amountPatterns) {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(a => amounts.add(a.trim()));
        }
    }
    if (amounts.size > 0) {
        entities.amounts = Array.from(amounts).slice(0, 10);
    }

    // Extract legal references (articles, clauses)
    const refPattern = /(?:статья|ст\.|article|art\.)\s*\d+(?:\.\d+)?/gi;
    const references = text.match(refPattern);
    if (references) {
        entities.references = Array.from(new Set(references)).slice(0, 20);
    }

    return entities;
}

/**
 * Extracts section headings from document
 */
export function extractSections(text: string): string[] {
    const sections = new Set<string>();

    // Pattern for numbered sections
    const sectionPatterns = [
        /(?:раздел|section|глава|chapter)\s+\d+[:\.]?\s*([^\n]+)/gi,
        /\d+\.\s+([А-ЯA-Z][^\n]{10,80})/g, // Capitalized headings with numbers
        /^[IVX]+\.\s+([А-ЯA-Z][^\n]{10,80})/gm, // Roman numerals
    ];

    for (const pattern of sectionPatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            const section = match[1]?.trim();
            if (section && section.length > 5 && section.length < 100) {
                sections.add(section);
            }
        }
    }

    return Array.from(sections).slice(0, 20); // Limit to 20 sections
}

/**
 * Extracts key terms using frequency analysis
 */
export function extractKeyTerms(text: string): string[] {
    // Remove common words (Russian and English stopwords)
    const stopWords = new Set([
        // Russian stopwords
        'и', 'в', 'на', 'с', 'по', 'для', 'к', 'от', 'за', 'из', 'у', 'о', 'об', 'до',
        'что', 'как', 'это', 'который', 'все', 'если', 'где', 'или', 'был', 'была',
        'быть', 'его', 'так', 'без', 'через', 'при', 'под', 'том', 'этот', 'все',
        'году', 'года', 'был', 'может', 'более', 'также', 'году', 'между', 'можно',
        // English stopwords
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
        'may', 'might', 'must', 'can', 'shall', 'from', 'into', 'during', 'before', 'after'
    ]);

    // Extract words (2+ chars, letters only)
    const words = text.toLowerCase().match(/[а-яёa-z]{3,}/gi) || [];

    // Count frequency
    const frequency = new Map<string, number>();
    for (const word of words) {
        if (!stopWords.has(word)) {
            frequency.set(word, (frequency.get(word) || 0) + 1);
        }
    }

    // Sort by frequency and take top terms
    const sortedTerms = Array.from(frequency.entries())
        .filter(([_, count]) => count >= 3) // Appear at least 3 times
        .sort((a, b) => b[1] - a[1])
        .map(([term, _]) => term)
        .slice(0, 30);

    return sortedTerms;
}

/**
 * Full document analysis - combines all extraction methods
 */
export function analyzeDocument(text: string): DocumentAnalysis {
    const docType = detectDocumentType(text);
    const embeddingModel = selectEmbeddingModel(docType);
    const entities = extractEntities(text);
    const sections = extractSections(text);
    const keyTerms = extractKeyTerms(text);

    // Calculate confidence based on number of indicators found
    const indicators = [
        entities.dates && entities.dates.length > 0,
        entities.amounts && entities.amounts.length > 0,
        entities.references && entities.references.length > 0,
        sections.length > 0,
        keyTerms.length > 10
    ].filter(Boolean).length;

    const confidence = Math.min(indicators / 5, 1);

    return {
        docType,
        confidence,
        embeddingModel,
        entities,
        sections,
        keyTerms
    };
}
