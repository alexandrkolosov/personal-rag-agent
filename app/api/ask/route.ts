import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { chatWithProvider } from "../../../lib/modelProvider";
import { SYSTEM_RAG, buildUserPrompt } from "../../../lib/prompt";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function approxTokenLen(s: string) {
  return Math.ceil(s.length / 4);
}

function dedupeAndMerge(matches: any[]) {
  const seen = new Set<string>();
  const unique = [];
  for (const m of matches) {
    const key = `${m.document_id}:${m.chunk_text.slice(0, 100)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(m);
    }
  }
  return unique;
}

function cleanJSON(raw: string): string {
  return raw
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
}

export async function POST(request: NextRequest) {
  const t0 = Date.now();

  try {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const body = await request.json();
    const { question, provider, projectId, role } = body;

    if (!question?.trim()) {
      return NextResponse.json({ error: "Вопрос не предоставлен" }, { status: 400 });
    }

    console.log(`Вопрос: "${question}" | Проект: ${projectId} | Роль: ${role}`);

    // Проверяем количество чанков
    let countQuery = supabase
        .from("doc_chunks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

    // Фильтруем по проекту если указан
    if (projectId && projectId !== 'null') {
      countQuery = countQuery.eq("project_id", projectId);
    }

    const { count } = await countQuery;

    if (!count) {
      return NextResponse.json({
        answer: "Не нашёл релевантной информации в документах проекта. Попробуйте переформулировать вопрос.",
        question,
      });
    }

    console.log(`Найдено ${count} чанков в проекте`);

    console.log('Генерация эмбеддинга...');
    const embedRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question
    });
    const queryEmbedding = embedRes.data[0].embedding;

    console.log('Поиск релевантных чанков...');
    const { data: matches, error: matchError } = await supabase.rpc("match_doc_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: 0.25, // Снизил порог для лучшего поиска
      match_count: 15,      // Увеличил количество
      filter_user_id: user.id,
      filter_project_id: projectId && projectId !== 'null' ? projectId : null
    });

    if (matchError) {
      console.error('Match error:', matchError);
      return NextResponse.json({ error: matchError.message }, { status: 500 });
    }

    if (!matches?.length) {
      console.log('Не найдено релевантных чанков');
      return NextResponse.json({
        answer: "Не нашёл релевантной информации в документах проекта. Попробуйте переформулировать вопрос.",
        question
      });
    }

    console.log(`Найдено ${matches.length} релевантных чанков`);

    const uniq = dedupeAndMerge(matches).slice(0, 10);
    const chunks = uniq.map((m: any) => ({
      doc_id: m.document_id,
      chunk_index: m.chunk_index ?? 0,
      similarity: m.similarity ?? 0,
      text: (m.chunk_text || "").slice(0, 2000)
    }));

    const ctxTokens = approxTokenLen(chunks.map(c => c.text).join(" "));
    const providerFinal = (provider as "openai" | "anthropic") ??
        (ctxTokens > 120_000 ? "anthropic" : "openai");

    console.log(`Используется провайдер: ${providerFinal}, контекст: ${ctxTokens} токенов`);

    // Добавляем роль в системный промпт если она указана
    let systemPrompt = SYSTEM_RAG;
    if (role && role !== 'analyst') {
      systemPrompt = `${role}\n\n${SYSTEM_RAG}`;
    }

    const userPrompt = buildUserPrompt(question, chunks);

    console.log('Запрос к модели...');
    const raw = await chatWithProvider(providerFinal, {
      system: systemPrompt,
      user: userPrompt,
      maxTokens: 4000
    });

    console.log(`Raw ответ (${raw.length} символов):`, raw.substring(0, 200));

    let parsed: any = null;

    try {
      const cleaned = cleanJSON(raw);
      if (cleaned) {
        parsed = JSON.parse(cleaned);
        console.log('JSON успешно распарсен');
      }
    } catch (e) {
      console.error('JSON parse error:', e);
    }

    const answer = parsed?.answer || raw || "Ошибка: пустой ответ от модели";
    const citations = parsed?.citations || chunks.slice(0, 3).map(c => ({
      doc_id: c.doc_id,
      chunk_index: c.chunk_index,
      similarity: c.similarity,
      quote: c.text.slice(0, 200)
    }));

    const insights = parsed?.insights || [];
    const follow_up_questions = parsed?.follow_up_questions || [];

    console.log(`Ответ получен. Insights: ${insights.length}, Follow-ups: ${follow_up_questions.length}`);

    const latency = Date.now() - t0;

    // Сохраняем сообщения с project_id
    await supabase.from("messages").insert([
      {
        user_id: user.id,
        role: "user",
        content: question,
        project_id: projectId && projectId !== 'null' ? projectId : null
      },
      {
        user_id: user.id,
        role: "assistant",
        content: answer,
        project_id: projectId && projectId !== 'null' ? projectId : null,
        metadata: {
          provider: providerFinal,
          latency_ms: latency,
          sources: citations,
          insights,
          follow_up_questions
        }
      }
    ]);

    return NextResponse.json({
      answer,
      question,
      sources: citations,
      insights,
      follow_up_questions,
      provider: providerFinal,
      latency_ms: latency
    });

  } catch (err: any) {
    console.error('Error:', err);
    return NextResponse.json({
      error: err?.message || "Unknown error"
    }, { status: 500 });
  }
}