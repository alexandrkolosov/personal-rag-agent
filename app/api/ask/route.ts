import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

export async function POST(request: NextRequest) {
  console.log('=== /api/ask вызван ===');
  
  try {
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

    const body = await request.json();
    const { question } = body;

    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Вопрос не предоставлен' }, { status: 400 });
    }

    console.log(`Вопрос: "${question}"`);

    // Проверка наличия чанков
    const { count } = await supabase
      .from('doc_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    console.log(`Чанков у пользователя: ${count}`);

    if (!count || count === 0) {
      return NextResponse.json({
        answer: 'У вас пока нет загруженных документов. Загрузите документы чтобы я мог ответить.',
        question,
      });
    }

    // Генерация эмбеддинга для вопроса
    console.log('Генерация эмбеддинга...');
    const queryEmbedding = await generateEmbedding(question);

    // Векторный поиск
    console.log('Поиск релевантных чанков...');
    const { data: matches, error: matchError } = await supabase.rpc(
      'match_doc_chunks',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: 5,
        filter_user_id: user.id,
      }
    );

    if (matchError) {
      console.error('Match error:', matchError);
      return NextResponse.json({ error: matchError.message }, { status: 500 });
    }

    console.log(`Найдено чанков: ${matches?.length || 0}`);

    if (!matches || matches.length === 0) {
      return NextResponse.json({
        answer: 'Не нашел релевантной информации в документах. Попробуйте переформулировать вопрос.',
        question,
      });
    }

    // Формирование контекста
    const context = matches
      .map((m: any, i: number) => 
        `[Фрагмент ${i + 1}, релевантность: ${(m.similarity * 100).toFixed(1)}%]\n${m.chunk_text}`
      )
      .join('\n\n---\n\n');

    console.log('Запрос к Claude...');

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        answer: '⚠️ ANTHROPIC_API_KEY не настроен.\n\nНайденный контекст:\n\n' + context,
        question,
      });
    }

    // Запрос к Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: 'Ты ассистент, отвечающий на вопросы на основе документов. Отвечай ТОЛЬКО на основе контекста. Отвечай на русском языке.',
      messages: [{
        role: 'user',
        content: `Контекст из документов:\n\n${context}\n\n---\n\nВопрос: ${question}\n\nОтветь на вопрос на основе контекста.`,
      }],
    });

    const answer = message.content[0].type === 'text' ? message.content[0].text : 'Ошибка получения ответа';

    console.log('✅ Ответ получен от Claude');

    // Сохранение истории
    await supabase.from('messages').insert([
      { user_id: user.id, role: 'user', content: question },
      { user_id: user.id, role: 'assistant', content: answer, metadata: { chunks: matches.length } },
    ]);

    return NextResponse.json({ answer, question, sources: matches.length });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown' 
    }, { status: 500 });
  }
}
