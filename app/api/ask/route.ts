import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { chatWithProvider } from "../../../lib/modelProvider";
import {
  SYSTEM_RAG,
  buildUserPrompt,
  analyzeClarificationNeed,
  mergeQuestionWithClarifications,
  ClarificationQuestion
} from "../../../lib/prompt";
import {
  PerplexityClient,
  shouldSearchWeb,
  enrichWithWebSearch
} from "../../../lib/perplexity";

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

function cleanAndParseJSON(raw: string): any {
  try {
    // Удаляем markdown блоки кода и пробелы
    let cleaned = raw
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();

    // Находим начало JSON (первая { или [)
    const jsonStart = cleaned.search(/[\{\[]/);
    if (jsonStart > 0) {
      cleaned = cleaned.substring(jsonStart);
    }

    // Находим конец JSON
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let jsonEnd = -1;

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{' || char === '[') {
          depth++;
        } else if (char === '}' || char === ']') {
          depth--;
          if (depth === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
      }
    }

    if (jsonEnd > 0) {
      cleaned = cleaned.substring(0, jsonEnd);
    }

    // Пробуем распарсить
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    console.log('Raw string was:', raw.substring(0, 500));
    return null;
  }
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
    const {
      question,
      provider,
      projectId,
      role,
      // НОВЫЕ параметры
      clarificationAnswers,  // Ответы на уточнения
      skipClarification,     // Пропустить уточнения
      webSearchEnabled,      // Включен ли web search
      forceWebSearch        // Принудительный web search
    } = body;

    if (!question?.trim()) {
      return NextResponse.json({ error: "Вопрос не предоставлен" }, { status: 400 });
    }

    console.log(`Вопрос: "${question}" | Проект: ${projectId} | Роль: ${role}`);
    console.log(`Web Search: enabled=${webSearchEnabled}, forced=${forceWebSearch}`);

    // Проверяем количество чанков
    let countQuery = supabase
        .from("doc_chunks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

    if (projectId && projectId !== 'null') {
      countQuery = countQuery.eq("project_id", projectId);
    }

    const { count } = await countQuery;

    // Получаем релевантные чанки (даже если их 0, для контекста)
    let chunks: any[] = [];
    let webContext: any = null;

    if (count && count > 0) {
      console.log(`Найдено ${count} чанков в проекте`);

      // Генерация эмбеддинга
      console.log('Генерация эмбеддинга...');
      const embedRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: question
      });
      const queryEmbedding = embedRes.data[0].embedding;

      // Поиск релевантных чанков
      console.log('Поиск релевантных чанков...');
      const { data: matches, error: matchError } = await supabase.rpc("match_doc_chunks", {
        query_embedding: queryEmbedding,
        match_threshold: 0.25,
        match_count: 15,
        filter_user_id: user.id,
        filter_project_id: projectId && projectId !== 'null' ? projectId : null
      });

      if (!matchError && matches?.length) {
        const uniq = dedupeAndMerge(matches).slice(0, 10);
        chunks = uniq.map((m: any) => ({
          doc_id: m.document_id,
          chunk_index: m.chunk_index ?? 0,
          similarity: m.similarity ?? 0,
          text: (m.chunk_text || "").slice(0, 2000)
        }));
        console.log(`Найдено ${chunks.length} релевантных чанков`);
      }
    }

    // ================== CLARIFICATION MODE ==================
    // Проверяем необходимость уточнений (только если не пропущено и нет ответов)
    if (!skipClarification && !clarificationAnswers) {
      const clarificationCheck = analyzeClarificationNeed(
          question,
          chunks,
          role
      );

      if (clarificationCheck.needed) {
        console.log('Требуются уточнения:', clarificationCheck.questions);

        // Проверяем, нужен ли web search как одно из уточнений
        if (!webSearchEnabled && chunks.length === 0) {
          clarificationCheck.questions?.push({
            id: 'enable_web_search',
            question: 'В документах нет релевантной информации. Искать ответ в интернете?',
            type: 'boolean',
            required: false,
            context: 'Поиск в интернете поможет найти актуальную информацию'
          });
        }

        return NextResponse.json({
          mode: 'needs_clarification',
          clarifications: clarificationCheck.questions,
          partialInsight: clarificationCheck.preliminaryInsight,
          originalQuestion: question,
          documentsFound: chunks.length
        });
      }
    }

    // Обогащаем вопрос уточнениями если они есть
    let finalQuestion = question;
    if (clarificationAnswers) {
      finalQuestion = mergeQuestionWithClarifications(question, clarificationAnswers);
      console.log('Обогащенный вопрос:', finalQuestion);

      // Проверяем, не включил ли пользователь web search через уточнения
      if (clarificationAnswers.enable_web_search === true) {
        body.webSearchEnabled = true;
      }
    }

    // ================== SMART WEB SEARCH ==================
    // Определяем, нужен ли web search
    const needsWeb = webSearchEnabled
        ? forceWebSearch || shouldSearchWeb(finalQuestion, chunks, false)
        : shouldSearchWeb(finalQuestion, chunks, false);

    if (needsWeb || (webSearchEnabled && chunks.length === 0)) {
      console.log('🌐 Выполняем web search...');

      try {
        const webEnrichment = await enrichWithWebSearch(
            finalQuestion,
            chunks,
            {
              searchRecencyFilter: detectTimeFilter(finalQuestion)
            }
        );

        webContext = webEnrichment;
        console.log('✅ Web search завершен, найдено источников:', webEnrichment.webSources?.length || 0);
      } catch (webError) {
        console.error('⚠️ Web search failed:', webError);
        // Продолжаем без web context
      }
    }

    // Если нет ни документов, ни web результатов
    if (!chunks.length && !webContext) {
      return NextResponse.json({
        answer: "Не нашёл информации ни в документах проекта, ни в интернете. Попробуйте переформулировать вопрос или загрузить релевантные документы.",
        question,
        sources: [],
        webSources: [],
        insights: [],
        follow_up_questions: ["Загрузить документы по этой теме?", "Включить расширенный поиск?"]
      });
    }

    // ================== ПОДГОТОВКА ПРОМПТА ==================
    const ctxTokens = approxTokenLen(chunks.map(c => c.text).join(" "));
    const providerFinal = (provider as "openai" | "anthropic") ??
        (ctxTokens > 120_000 ? "anthropic" : "openai");

    console.log(`Используется провайдер: ${providerFinal}, контекст: ${ctxTokens} токенов`);

    // Формируем системный промпт с ролью
    let systemPrompt = SYSTEM_RAG;
    if (role && role !== 'analyst') {
      const rolePrefix = role === 'custom' ? role : `ROLE: ${role}\n\n`;
      systemPrompt = `${rolePrefix}${SYSTEM_RAG}`;
    }

    // Добавляем инструкции для web context
    if (webContext) {
      systemPrompt += `\n\nWEB SEARCH INTEGRATION:
- You have access to both document context and real-time web search results
- Clearly distinguish between information from documents vs web
- Prioritize recent web data for current events and market information
- Cross-validate facts between sources when possible`;
    }

    // Строим промпт с комбинированным контекстом
    const userPrompt = buildEnhancedUserPrompt(
        finalQuestion,
        chunks,
        webContext,
        clarificationAnswers
    );

    console.log('Запрос к модели...');
    const raw = await chatWithProvider(providerFinal, {
      system: systemPrompt,
      user: userPrompt,
      maxTokens: 4000
    });

    console.log(`Raw ответ (первые 200 символов):`, raw.substring(0, 200));

    // Парсим JSON из ответа модели
    let parsed = cleanAndParseJSON(raw);

    if (!parsed) {
      console.log('JSON парсинг не удался, используем raw текст');
      parsed = {
        answer: raw,
        citations: [],
        insights: [],
        follow_up_questions: []
      };
    }

    // Извлекаем данные
    const answer = parsed.answer || "Ошибка: не удалось получить ответ";
    const citations = parsed.citations || chunks.slice(0, 3).map(c => ({
      doc_id: c.doc_id,
      chunk_index: c.chunk_index,
      similarity: c.similarity,
      quote: c.text.slice(0, 200)
    }));

    // Добавляем web источники если есть
    const webSources = webContext?.webSources || [];

    const insights = parsed.insights || [];
    const follow_up_questions = parsed.follow_up_questions || [];

    console.log(`Ответ получен. Answer: ${answer.length} chars, Web sources: ${webSources.length}`);

    const latency = Date.now() - t0;

    // Сохраняем сообщения с расширенными метаданными
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
          webSources,  // НОВОЕ
          insights,
          follow_up_questions,
          usedWebSearch: !!webContext,  // НОВОЕ
          hadClarifications: !!clarificationAnswers  // НОВОЕ
        }
      }
    ]);

    // Возвращаем расширенный ответ
    return NextResponse.json({
      answer,
      question,
      sources: citations,
      webSources,  // НОВОЕ: источники из web
      insights,
      follow_up_questions,
      provider: providerFinal,
      latency_ms: latency,
      usedWebSearch: !!webContext  // НОВОЕ: флаг использования web
    });

  } catch (err: any) {
    console.error('Error in /api/ask:', err);
    return NextResponse.json({
      error: err?.message || "Unknown error",
      answer: "Произошла ошибка при обработке запроса. Попробуйте еще раз.",
      sources: [],
      webSources: [],
      insights: [],
      follow_up_questions: []
    }, { status: 500 });
  }
}

// ================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==================

// Определение временного фильтра для web search
function detectTimeFilter(question: string): 'day' | 'week' | 'month' | 'year' | undefined {
  const lowerQ = question.toLowerCase();

  if (lowerQ.includes('сегодня') || lowerQ.includes('today')) return 'day';
  if (lowerQ.includes('неделе') || lowerQ.includes('week')) return 'week';
  if (lowerQ.includes('месяц') || lowerQ.includes('month')) return 'month';
  if (lowerQ.includes('год') || lowerQ.includes('year')) return 'year';

  return undefined;
}

// Расширенная функция построения промпта с web context
function buildEnhancedUserPrompt(
    question: string,
    documentChunks: any[],
    webContext: any,
    clarificationAnswers?: any
): string {
  let prompt = '';

  // Добавляем контекст из документов
  if (documentChunks.length > 0) {
    prompt += 'DOCUMENT CONTEXT:\n';
    prompt += documentChunks.map((c, i) =>
        `[Doc ${i+1}] (Similarity: ${(c.similarity * 100).toFixed(1)}%)\n${c.text}\n`
    ).join('\n---\n');
  }

  // Добавляем web контекст
  if (webContext) {
    prompt += '\n\nWEB SEARCH RESULTS (Real-time):\n';
    prompt += webContext.webAnswer || '';

    if (webContext.webSources?.length > 0) {
      prompt += '\n\nWeb Sources:\n';
      prompt += webContext.webSources.map((s: any) => `- ${s.title || s.url}`).join('\n');
    }
  }

  // Добавляем уточнения
  if (clarificationAnswers) {
    prompt += '\n\nUSER CLARIFICATIONS:\n';
    prompt += Object.entries(clarificationAnswers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
  }

  prompt += `\n\nUSER QUESTION:\n${question}\n\n`;
  prompt += 'Provide a comprehensive answer using both document and web context where available. ';
  prompt += 'Clearly indicate which information comes from documents vs web sources.';

  return prompt;
}