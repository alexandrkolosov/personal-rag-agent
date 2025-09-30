import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const chunkSize = 1000;
  const overlap = 200;
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = startIndex + chunkSize;
    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk.length > 0) chunks.push(chunk);
    startIndex = endIndex - overlap;
  }

  return chunks;
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

    if (!file) {
      return NextResponse.json({ error: 'Файл не предоставлен' }, { status: 400 });
    }

    console.log(`Файл: ${file.name}, ${file.size} bytes, тип: ${file.type}`);

    // Проверка типа файла - ПОКА ТОЛЬКО TXT И DOCX
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Поддерживаются только DOCX и TXT файлы. PDF будет добавлен позже.'
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
        .upload(storagePath, buffer, { contentType: file.type });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Парсинг документа
    console.log('Парсинг...');
    let parsedText = '';

    try {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        parsedText = result.value;
      } else if (file.type === 'text/plain') {
        parsedText = buffer.toString('utf-8');
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

    // Сохранение в БД
    console.log('Сохранение в БД...');
    const { data: docData, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          filename: file.name,
          storage_path: storagePath,
          file_type: file.type,
          file_size: file.size,
          content_preview: parsedText.substring(0, 500),
        })
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

    // Эмбеддинги
    console.log('Генерация эмбеддингов...');
    let embeddings: number[][];

    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
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

    // Сохранение чанков
    console.log('Сохранение чанков...');
    const chunksToInsert = chunks.map((chunk, index) => ({
      document_id: docData.id,
      user_id: user.id,
      chunk_text: chunk,
      chunk_index: index,
      embedding: embeddings[index],
    }));

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
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}