import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });

        return response.data[0].embedding;
    } catch (error) {
        console.error('Embedding generation error:', error);
        throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: texts,
        });

        return response.data.map(item => item.embedding);
    } catch (error) {
        console.error('Batch embedding generation error:', error);
        throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}