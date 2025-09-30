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
        throw new Error(`Unsupported type: ${mimeType}`);
    }
  } catch (error) {
    console.error('Parse error:', error);
    throw new Error(`Parse failed: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

async function parsePDF(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  return data.text;
}

async function parseDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
