import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { analyzeDocument } from '@/lib/documentAnalyzer';
import { extractChunkMetadata } from '@/lib/metadataExtractor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const chunkSize = 2000;
  const overlap = 500;
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = startIndex + chunkSize;
    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk.length > 0) chunks.push(chunk);
    startIndex = endIndex - overlap;
  }

  return chunks;
}

async function parseExcel(buffer: Buffer): Promise<string> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    let fullText = '';

    // Обрабатываем каждый лист
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];

      // Добавляем название листа
      fullText += `\n=== Лист: ${sheetName} ===\n\n`;

      // Конвертируем в CSV для лучшего представления текста
      const csvData = XLSX.utils.sheet_to_csv(worksheet, {
        blankrows: false,
        skipHidden: true
      });

      // Также получаем JSON для структурированных данных
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false
      });

      // Форматируем данные как таблицу
      if (jsonData.length > 0) {
        // Первая строка - заголовки
        const headers = jsonData[0] as any[];
        fullText += 'Заголовки: ' + headers.join(' | ') + '\n';
        fullText += '-'.repeat(50) + '\n';

        // Остальные строки - данные
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          const rowText = row.map((cell, idx) => {
            const header = headers[idx] || `Колонка ${idx + 1}`;
            return `${header}: ${cell || 'пусто'}`;
          }).join('; ');
          fullText += `Строка ${i}: ${rowText}\n`;
        }
      }

      fullText += '\n';
    }

    return fullText.trim();
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error(`Ошибка парсинга Excel: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

export async function POST(request: NextRequest) {
  console.log('=== POST /api/ingest вызван ===');

  try {
    const [mammoth, { default: OpenAI }] = await Promise.all([
      import('mammoth'),
      import('openai'),
    ]);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const autoSummary = formData.get('autoSummary') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'Файл не предоставлен' }, { status: 400 });
    }

    console.log(`Файл: ${file.name}, ${file.size} bytes, тип: ${file.type}`);
    console.log(`Проект: ${projectId}, Авто-саммари: ${autoSummary}`);

    // Расширенная проверка типов файлов
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'text/plain', // .txt
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/pdf', // .pdf
    ];

    // Проверка по MIME-типу или расширению
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const isExcelFile = fileExtension === 'xlsx' || fileExtension === 'xls' || fileExtension === 'csv';
    const isPdfFile = fileExtension === 'pdf' || file.type === 'application/pdf';

    if (!allowedTypes.includes(file.type) && !isExcelFile && !isPdfFile) {
      return NextResponse.json({
        error: 'Поддерживаются только DOCX, TXT, XLSX, XLS, CSV и PDF файлы.'
      }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${user.id}/${timestamp}-${safeName}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Загрузка в Storage
    console.log('Загрузка в Storage...');
    const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, buffer, {
          contentType: file.type || 'application/octet-stream'
        });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Парсинг документа
    console.log('Парсинг документа...');
    let parsedText = '';

    try {
      if (file.type === 'application/pdf' || isPdfFile) {
        // PDF
        const pdfParse = (await import('pdf-parse')).default;
        const pdfData = await pdfParse(buffer);
        parsedText = pdfData.text;
        console.log(`PDF: ${pdfData.numpages} страниц`);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // DOCX
        const result = await mammoth.extractRawText({ buffer });
        parsedText = result.value;
      } else if (file.type === 'text/plain' || fileExtension === 'txt') {
        // TXT
        parsedText = buffer.toString('utf-8');
      } else if (file.type === 'text/csv' || fileExtension === 'csv') {
        // CSV - обрабатываем как текст
        parsedText = buffer.toString('utf-8');
        // Преобразуем CSV в более читаемый формат
        const lines = parsedText.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim());
          let formattedText = 'Заголовки: ' + headers.join(' | ') + '\n\n';

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row = headers.map((h, idx) => `${h}: ${values[idx] || 'пусто'}`).join('; ');
            formattedText += `Строка ${i}: ${row}\n`;
          }
          parsedText = formattedText;
        }
      } else if (isExcelFile ||
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'application/vnd.ms-excel') {
        // Excel
        parsedText = await parseExcel(buffer);
      } else {
        throw new Error(`Неподдерживаемый тип файла: ${file.type}`);
      }

      console.log(`Распарсено ${parsedText.length} символов`);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      await supabase.storage.from('documents').remove([storagePath]);
      return NextResponse.json({
        error: `Ошибка парсинга: ${parseError instanceof Error ? parseError.message : 'Unknown'}`
      }, { status: 500 });
    }

    if (parsedText.length < 10) {
      await supabase.storage.from('documents').remove([storagePath]);
      return NextResponse.json({ error: 'Документ пустой или слишком короткий' }, { status: 400 });
    }

    // Анализ документа для определения типа и извлечения метаданных
    console.log('Анализ документа...');
    const analysis = analyzeDocument(parsedText);
    console.log(`Тип документа: ${analysis.docType}, Модель: ${analysis.embeddingModel}, Уверенность: ${analysis.confidence}`);

    // Сохранение в БД
    console.log('Сохранение в БД...');
    const docToInsert: any = {
      user_id: user.id,
      filename: file.name,
      storage_path: storagePath,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      content_preview: parsedText.substring(0, 500),
      doc_type: analysis.docType,
      embedding_model: analysis.embeddingModel,
      metadata: {
        entities: analysis.entities,
        sections: analysis.sections,
        keyTerms: analysis.keyTerms,
        confidence: analysis.confidence
      }
    };

    if (projectId && projectId !== 'null' && projectId !== 'undefined') {
      docToInsert.project_id = projectId;
    }

    const { data: docData, error: dbError } = await supabase
        .from('documents')
        .insert(docToInsert)
        .select()
        .single();

    if (dbError) {
      console.error('DB error:', dbError);
      await supabase.storage.from('documents').remove([storagePath]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Чанкинг
    console.log('Создание чанков...');
    const chunks = chunkText(parsedText);
    console.log(`Создано ${chunks.length} чанков`);

    if (chunks.length === 0) {
      await supabase.from('documents').delete().eq('id', docData.id);
      await supabase.storage.from('documents').remove([storagePath]);
      return NextResponse.json({ error: 'Не удалось создать чанки' }, { status: 500 });
    }

    // Эмбеддинги с использованием выбранной модели
    console.log(`Генерация эмбеддингов с моделью ${analysis.embeddingModel}...`);
    let embeddings: number[][];

    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.embeddings.create({
        model: analysis.embeddingModel,
        input: chunks,
      });
      embeddings = response.data.map(item => item.embedding);
      console.log(`Сгенерировано ${embeddings.length} эмбеддингов`);
    } catch (embError) {
      console.error('Embedding error:', embError);
      await supabase.from('documents').delete().eq('id', docData.id);
      await supabase.storage.from('documents').remove([storagePath]);
      return NextResponse.json({
        error: `Ошибка эмбеддингов: ${embError instanceof Error ? embError.message : 'Unknown'}`
      }, { status: 500 });
    }

    // Сохранение чанков с метаданными
    console.log('Сохранение чанков с метаданными...');
    const isLargeModel = analysis.embeddingModel === 'text-embedding-3-large';
    console.log(`Модель: ${analysis.embeddingModel}, Использовать large колонку: ${isLargeModel}`);

    const chunksToInsert = chunks.map((chunk, index) => {
      const chunkMetadata = extractChunkMetadata(chunk, index, analysis.sections);

      const chunkData: any = {
        document_id: docData.id,
        user_id: user.id,
        project_id: projectId && projectId !== 'null' && projectId !== 'undefined' ? projectId : null,
        chunk_text: chunk,
        chunk_index: index,
        metadata: chunkMetadata,
        embedding_model: analysis.embeddingModel
      };

      // Use appropriate column based on model
      if (isLargeModel) {
        chunkData.embedding_large = embeddings[index];
        chunkData.embedding = null; // Clear small embedding
      } else {
        chunkData.embedding = embeddings[index];
        chunkData.embedding_large = null; // Clear large embedding
      }

      return chunkData;
    });

    const { error: chunksError } = await supabase
        .from('doc_chunks')
        .insert(chunksToInsert);

    if (chunksError) {
      console.error('Chunks error:', chunksError);
      await supabase.from('documents').delete().eq('id', docData.id);
      await supabase.storage.from('documents').remove([storagePath]);
      return NextResponse.json({ error: chunksError.message }, { status: 500 });
    }

    console.log('Документ полностью обработан!');

    return NextResponse.json({
      success: true,
      filename: file.name,
      documentId: docData.id,
      chunksCount: chunks.length,
      projectId: projectId,
      fileType: isPdfFile ? 'PDF' : (isExcelFile ? 'Excel' : file.type),
      analysis: {
        docType: analysis.docType,
        embeddingModel: analysis.embeddingModel,
        confidence: analysis.confidence,
        sectionsFound: analysis.sections.length,
        entitiesFound: Object.keys(analysis.entities).length
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}