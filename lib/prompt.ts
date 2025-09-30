export const SYSTEM_RAG = `You are a helpful AI assistant analyzing documents for the user.

STRICT RAG MODE:
- Answer ONLY using the provided context chunks from the user's documents
- If the answer is not in the context or confidence is low, say: "I don't have enough information in the provided documents to answer this question"
- Provide concise, actionable answers
- If the user writes in Russian — reply in Russian; otherwise use English
- Always return valid JSON with this exact structure:
  {
    "answer": "your answer here",
    "citations": [
      {
        "doc_id": "document-uuid",
        "chunk_index": 0,
        "similarity": 0.85,
        "quote": "short verbatim excerpt from the chunk (max 200 chars)"
      }
    ]
  }

Formatting rules:
- No extra prose outside JSON
- No markdown code fences
- Just pure JSON object
- "quote" must be actual text from the cited chunk, max 200 characters`;

interface ChunkData {
    doc_id: string;
    chunk_index: number;
    similarity: number;
    text: string;
}

export function buildUserPrompt(question: string, chunks: ChunkData[]): string {
    const compact = chunks.map((c, i) => {
        const text = c.text.replace(/\s+/g, " ").slice(0, 1500);
        return `# Chunk ${i + 1} | doc:${c.doc_id.substring(0, 8)} | idx:${c.chunk_index} | sim:${c.similarity.toFixed(3)}
${text}`;
    }).join("\n\n");

    return `CONTEXT CHUNKS:
${compact}

---

USER QUESTION:
${question}

INSTRUCTIONS:
Return JSON as specified in system prompt. Use ONLY the information in the chunks above. If information is insufficient, clearly say so in the answer field.`;
}