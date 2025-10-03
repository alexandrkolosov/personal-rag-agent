// lib/metadataExtractor.ts
// Extracts metadata from document chunks for enhanced search and comparison

export interface ChunkMetadata {
    section?: string;
    clause_number?: string;
    parties?: string[];
    dates?: string[];
    amounts?: string[];
    legal_references?: string[];
    chunk_type?: 'header' | 'clause' | 'definition' | 'signature' | 'general';
}

/**
 * Extracts metadata from a text chunk
 */
export function extractChunkMetadata(
    chunkText: string,
    chunkIndex: number,
    fullDocSections: string[]
): ChunkMetadata {
    const metadata: ChunkMetadata = {};

    // Detect chunk type
    metadata.chunk_type = detectChunkType(chunkText);

    // Extract section (if chunk starts with or contains a section heading)
    const sectionMatch = chunkText.match(/^(?:раздел|section|глава|chapter)\s+\d+[:\.]?\s*([^\n]+)/i);
    if (sectionMatch) {
        metadata.section = sectionMatch[0].trim();
    } else {
        // Try to find which section this chunk belongs to based on full doc sections
        const matchingSection = fullDocSections.find(section =>
            chunkText.toLowerCase().includes(section.toLowerCase().substring(0, 30))
        );
        if (matchingSection) {
            metadata.section = matchingSection;
        }
    }

    // Extract clause number
    const clauseMatch = chunkText.match(/^(\d+(?:\.\d+)*)\s+/m);
    if (clauseMatch) {
        metadata.clause_number = clauseMatch[1];
    }

    // Extract parties (names in quotes or after "Сторона:", "Party:")
    const partyPatterns = [
        /"([^"]+)"/g, // Quoted names
        /(?:сторона|party)[\s:]+([А-ЯA-Z][а-яa-z\s]+(?:ООО|ОАО|ЗАО|LLC|Inc|Corp)?)/gi,
    ];

    const parties = new Set<string>();
    for (const pattern of partyPatterns) {
        const matches = chunkText.matchAll(pattern);
        for (const match of matches) {
            const party = match[1]?.trim();
            if (party && party.length > 2 && party.length < 100) {
                parties.add(party);
            }
        }
    }
    if (parties.size > 0) {
        metadata.parties = Array.from(parties).slice(0, 5);
    }

    // Extract dates
    const datePatterns = [
        /\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4}/g,
        /\d{4}-\d{2}-\d{2}/g,
        /"\d{1,2}"\s+[а-яА-Я]+\s+\d{4}/g,
    ];

    const dates = new Set<string>();
    for (const pattern of datePatterns) {
        const matches = chunkText.match(pattern);
        if (matches) {
            matches.forEach(d => dates.add(d));
        }
    }
    if (dates.size > 0) {
        metadata.dates = Array.from(dates).slice(0, 5);
    }

    // Extract amounts
    const amountPatterns = [
        /\d+[\s,]?\d*\s*(?:руб\.|рублей|dollars?|usd|eur|€|\$)/gi,
        /\d+[\s,]?\d*\.\d{2}\s*(?:руб\.|рублей|dollars?|usd|eur)/gi,
    ];

    const amounts = new Set<string>();
    for (const pattern of amountPatterns) {
        const matches = chunkText.match(pattern);
        if (matches) {
            matches.forEach(a => amounts.add(a.trim()));
        }
    }
    if (amounts.size > 0) {
        metadata.amounts = Array.from(amounts).slice(0, 5);
    }

    // Extract legal references
    const refPattern = /(?:статья|ст\.|article|art\.|пункт|п\.|clause)\s*\d+(?:\.\d+)?/gi;
    const references = chunkText.match(refPattern);
    if (references) {
        metadata.legal_references = Array.from(new Set(references)).slice(0, 10);
    }

    return metadata;
}

/**
 * Detects the type of chunk based on content
 */
function detectChunkType(chunkText: string): ChunkMetadata['chunk_type'] {
    const lowerText = chunkText.toLowerCase();

    // Check for headers
    if (/^(?:раздел|section|глава|chapter|приложение|appendix)\s+\d+/i.test(chunkText)) {
        return 'header';
    }

    // Check for definitions
    if (lowerText.includes('определение') || lowerText.includes('definition') ||
        lowerText.includes('термины') || lowerText.includes('terms')) {
        return 'definition';
    }

    // Check for signature block
    if (lowerText.includes('подпись') || lowerText.includes('signature') ||
        lowerText.includes('м.п.') || lowerText.includes('seal')) {
        return 'signature';
    }

    // Check for numbered clause
    if (/^\d+(?:\.\d+)*\s+/.test(chunkText)) {
        return 'clause';
    }

    return 'general';
}

/**
 * Enriches chunk metadata with document-level context
 */
export function enrichChunkMetadata(
    chunkMetadata: ChunkMetadata,
    documentMetadata: {
        docType: string;
        entities: any;
        sections: string[];
    }
): ChunkMetadata {
    const enriched = { ...chunkMetadata };

    // If chunk doesn't have section, try to infer from document sections
    if (!enriched.section && documentMetadata.sections.length > 0) {
        // For now, we'll leave this for future enhancement
        // Could use semantic similarity to match chunk to nearest section
    }

    // Add document-level parties if chunk doesn't have any
    if (!enriched.parties && documentMetadata.entities.parties) {
        enriched.parties = documentMetadata.entities.parties.slice(0, 3);
    }

    return enriched;
}
