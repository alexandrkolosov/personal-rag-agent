import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export async function parseDocument(buffer: Buffer, mimeType: string): Promise<string> {
    try {
        switch (mimeType) {
            case 'application/pdf':
                return await parsePDF(buffer);

            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return await parseDOCX(buffer);

            case 'text/plain':
                return buffer.toString('utf-8');

            default:
                throw new Error(`Unsupported MIME type: ${mimeType}`);
        }
    } catch (error) {
        console.error('Document parsing error:', error);
        throw new Error(`Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function parsePDF(buffer: Buffer): Promise<string> {
    try {
        const data = await pdf(buffer);
        return data.text;
    } catch (error) {
        console.error('PDF parsing error:', error);
        throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function parseDOCX(buffer: Buffer): Promise<string> {
    try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } catch (error) {
        console.error('DOCX parsing error:', error);
        throw new Error(`DOCX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}