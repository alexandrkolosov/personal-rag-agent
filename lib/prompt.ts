// lib/prompt.ts

// Основной системный промпт - более гибкий и креативный
export const SYSTEM_RAG = `You are an advanced AI assistant with document analysis capabilities and creative problem-solving skills.

WORKING MODES:
1. DOCUMENT ANALYSIS: When answering questions about uploaded documents, use provided context
2. CREATIVE MODE: When asked to CREATE (letters, emails, reports, plans), generate complete content
3. HYBRID MODE: Combine document insights with creative solutions and recommendations

RESPONSE PRINCIPLES:
- Be comprehensive and detailed (500-2000+ words when appropriate)
- Don't just describe what you would do - ACTUALLY DO IT
- Provide multiple perspectives and alternatives
- Include specific examples and actionable steps
- Think critically and identify gaps, risks, opportunities
- Match user's language (Russian/English)
- Use proper markdown formatting with line breaks (\n) between sections and table rows
- Ensure tables have proper newlines: each row on a separate line

JSON RESPONSE STRUCTURE:
{
  "answer": "Your COMPLETE comprehensive response here with FULL markdown formatting (##, ###, tables, lists, etc.). Include ALL analysis, ALL sections, ALL details. For document comparisons, include the ENTIRE comparison with all differences and similarities. This field contains the FULL response shown to user - NEVER summarize or truncate!",
  "citations": [
    {
      "doc_id": "document-uuid",
      "chunk_index": 0,
      "similarity": 0.85,
      "quote": "relevant excerpt (max 200 chars)"
    }
  ],
  "insights": [
    {
      "type": "risk|opportunity|recommendation|gap",
      "content": "detailed insight description",
      "importance": 1-5,
      "action_required": "specific action if needed"
    }
  ],
  "follow_up_questions": [
    "Strategic question to deepen analysis",
    "Question to clarify requirements",
    "Question to explore alternatives"
  ],
  "confidence_level": "high|medium|low",
  "data_gaps": ["missing info 1", "missing info 2"]
}

CRITICAL RULES:
- When asked to write something, write it IN FULL in the answer field
- Don't say "I would write" - actually write it
- For creative tasks, citations are optional
- Be proactive with suggestions and improvements
- If information is partial, work with what you have and note gaps`;

// Расширенные роли с более детальными инструкциями
export const ROLE_PROMPTS = {
    analyst: `
ROLE: Senior Business Analyst & Strategic Advisor
MINDSET: Critical thinker, pattern recognizer, risk identifier
FOCUS AREAS:
- Data patterns and anomalies
- Hidden risks and dependencies
- Process inefficiencies
- Strategic opportunities
- Competitive advantages
APPROACH:
- Question every assumption
- Validate all numbers
- Find contradictions
- Propose multiple scenarios
- Recommend specific actions with timelines
OUTPUT STYLE: Structured analysis with executive summary, detailed findings, and prioritized recommendations
`,

    cfo: `
ROLE: Chief Financial Officer & Financial Strategist
MINDSET: Numbers-driven, risk-aware, growth-focused
FOCUS AREAS:
- Financial metrics (CAC, LTV, burn rate, runway)
- Unit economics and profitability paths
- Cash flow optimization
- Investment efficiency
- Financial risks and hedging strategies
APPROACH:
- Verify all calculations
- Model different scenarios
- Identify cost optimization opportunities
- Propose funding strategies
- Create financial projections
OUTPUT STYLE: Financial reports with clear metrics, charts (described), and actionable recommendations
`,

    lawyer: `
ROLE: Senior Legal Counsel & Risk Advisor
MINDSET: Risk-mitigator, detail-oriented, protective
FOCUS AREAS:
- Legal compliance and regulatory requirements
- Contract terms and obligations
- Intellectual property protection
- Liability exposure
- Data privacy and security
APPROACH:
- Identify all legal risks
- Suggest protective clauses
- Review for compliance gaps
- Propose risk mitigation strategies
- Draft legal documents when needed
OUTPUT STYLE: Legal memorandums with clear risk assessment and specific recommendations
`,

    investor: `
ROLE: Venture Capital Partner & Strategic Investor
MINDSET: Growth-focused, metric-driven, exit-oriented
FOCUS AREAS:
- Market size and growth potential
- Scalability and unit economics
- Competitive differentiation
- Team and execution capability
- Exit strategy and ROI potential
APPROACH:
- Challenge growth assumptions
- Evaluate realistic vs optimistic scenarios
- Assess competitive moats
- Calculate potential returns
- Identify key risks to scale
OUTPUT STYLE: Investment memos with thesis, risks, opportunities, and valuation perspectives
`,

    cmo: `
ROLE: Chief Marketing Officer & Growth Strategist
MINDSET: Customer-centric, data-driven, creative
FOCUS AREAS:
- Customer acquisition channels and costs
- Brand positioning and messaging
- Marketing attribution and ROI
- Customer retention and LTV
- Competitive positioning
APPROACH:
- Analyze channel performance
- Optimize conversion funnels
- Propose creative campaigns
- Build customer personas
- Design growth experiments
OUTPUT STYLE: Marketing strategies with specific campaigns, budgets, and KPIs
`,

    custom: `
ROLE: Adaptive Expert
MINDSET: Flexible, comprehensive, solution-oriented
APPROACH: Adapt to the specific needs of the task
OUTPUT STYLE: Match the requirements of the request
`
};

// lib/prompt.ts - добавить новые типы и функции

export interface ClarificationQuestion {
    id: string;
    question: string;
    type: 'select' | 'multiselect' | 'text' | 'boolean' | 'date_range';
    options?: string[];
    required: boolean;
    context?: string; // Почему спрашиваем
}

export interface ClarificationResponse {
    mode: 'needs_clarification';
    clarifications: ClarificationQuestion[];
    partialInsight?: string; // Что уже можем сказать
    confidence: number;
    originalQuestion: string;
}

// Функция анализа необходимости уточнений
export function analyzeClarificationNeed(
    question: string,
    documentContext: any[],
    projectRole?: string
): { needed: boolean; questions?: ClarificationQuestion[]; preliminaryInsight?: string } {

    const lowerQ = question.toLowerCase();
    const clarifications: ClarificationQuestion[] = [];

    // Проверяем неопределенности
    if (lowerQ.includes('анализ') || lowerQ.includes('analyze')) {
        if (!lowerQ.match(/за (.*) период|с (\d{4})|последн/)) {
            clarifications.push({
                id: 'time_period',
                question: 'За какой период провести анализ?',
                type: 'select',
                options: ['Последний месяц', 'Последний квартал', 'Последний год', 'Все время', 'Другой период'],
                required: true,
                context: 'Для точного анализа нужно определить временные рамки'
            });
        }
    }

    if (lowerQ.includes('сравн') || lowerQ.includes('compar')) {
        // Check if specific entities are mentioned
        const hasSpecificEntities = /\b([A-Z][a-z]+\s*){2,}\b/.test(question); // Check for capitalized words (company names)

        if (!hasSpecificEntities) {
            clarifications.push({
                id: 'comparison_entities',
                question: 'Какие конкретно компании/объекты сравнить? (Укажите названия через запятую)',
                type: 'text',
                required: true,
                context: 'Для точного сравнения нужны конкретные названия'
            });
        }

        // Check for location context
        if (!lowerQ.match(/россия|russia|франция|france|китай|china|сша|usa/i)) {
            clarifications.push({
                id: 'geographic_scope',
                question: 'В каком регионе/стране? (опционально)',
                type: 'text',
                required: false,
                context: 'Регион помогает найти более релевантную информацию'
            });
        }
    }

    if (lowerQ.includes('отчет') || lowerQ.includes('report')) {
        clarifications.push({
            id: 'report_format',
            question: 'В каком формате подготовить отчет?',
            type: 'select',
            options: ['Executive Summary', 'Детальный анализ', 'Презентация', 'Таблица метрик'],
            required: false,
            context: 'Выберите уровень детализации'
        });
    }

    // Проверяем достаточность контекста
    const hasRelevantDocs = documentContext.some(d => d.similarity > 0.7);
    if (!hasRelevantDocs && documentContext.length > 0) {
        clarifications.push({
            id: 'search_web',
            question: 'Документы содержат мало релевантной информации. Искать дополнительные данные в интернете?',
            type: 'boolean',
            required: false,
            context: 'Это поможет дополнить анализ актуальными данными'
        });
    }

    const preliminaryInsight = hasRelevantDocs
        ? `Найдено ${documentContext.filter(d => d.similarity > 0.7).length} релевантных документов. После уточнений смогу провести детальный анализ.`
        : `По вашему вопросу есть ограниченная информация в документах. Уточнения помогут сформировать точный ответ.`;

    return {
        needed: clarifications.length > 0,
        questions: clarifications,
        preliminaryInsight
    };
}

// Функция объединения вопроса с уточнениями
export function mergeQuestionWithClarifications(
    originalQuestion: string,
    clarifications: Record<string, any>
): string {
    let enrichedQuestion = originalQuestion;

    if (clarifications.time_period) {
        enrichedQuestion += ` [Период: ${clarifications.time_period}]`;
    }

    if (clarifications.comparison_target) {
        const targets = Array.isArray(clarifications.comparison_target)
            ? clarifications.comparison_target.join(', ')
            : clarifications.comparison_target;
        enrichedQuestion += ` [Сравнить с: ${targets}]`;
    }

    if (clarifications.report_format) {
        enrichedQuestion += ` [Формат: ${clarifications.report_format}]`;
    }

    return enrichedQuestion;
}
// Типы задач для разных подходов
export const TASK_TYPES = {
    ANALYSIS: 'analysis',
    CREATION: 'creation',
    HYBRID: 'hybrid',
    SUMMARY: 'summary',
    CRITICAL_REVIEW: 'critical_review'
};

// Определение типа задачи по вопросу
export function detectTaskType(question: string): string {
    const lowerQuestion = question.toLowerCase();

    const creationKeywords = ['напиши', 'создай', 'составь', 'подготовь', 'write', 'create', 'draft', 'prepare'];
    const analysisKeywords = ['анализ', 'оцени', 'проверь', 'найди', 'analyze', 'evaluate', 'assess', 'find'];
    const summaryKeywords = ['резюме', 'кратко', 'summary', 'brief', 'основные'];
    const criticalKeywords = ['критич', 'риски', 'проблем', 'critical', 'risks', 'issues'];

    if (creationKeywords.some(kw => lowerQuestion.includes(kw))) {
        return TASK_TYPES.CREATION;
    }
    if (criticalKeywords.some(kw => lowerQuestion.includes(kw))) {
        return TASK_TYPES.CRITICAL_REVIEW;
    }
    if (summaryKeywords.some(kw => lowerQuestion.includes(kw))) {
        return TASK_TYPES.SUMMARY;
    }
    if (analysisKeywords.some(kw => lowerQuestion.includes(kw))) {
        return TASK_TYPES.ANALYSIS;
    }

    return TASK_TYPES.HYBRID;
}

// Улучшенная функция построения промпта
interface ChunkData {
    doc_id: string;
    chunk_index: number;
    similarity: number;
    text: string;
}

export function buildUserPrompt(
    question: string,
    chunks: ChunkData[],
    role?: string,
    previousContext?: any
): string {
    const taskType = detectTaskType(question);

    // Форматируем чанки с большим контекстом
    const contextChunks = chunks.map((c, i) => {
        const text = c.text.replace(/\s+/g, " ").slice(0, 2500); // Увеличено до 2500
        return `# Document Fragment ${i + 1}
Source: doc_${c.doc_id.substring(0, 8)}
Relevance: ${(c.similarity * 100).toFixed(1)}%
Content: ${text}`;
    }).join("\n\n---\n\n");

    // Добавляем роль если указана
    const roleContext = role && ROLE_PROMPTS[role as keyof typeof ROLE_PROMPTS]
        ? `ACTIVE ROLE & PERSPECTIVE:\n${ROLE_PROMPTS[role as keyof typeof ROLE_PROMPTS]}\n`
        : '';

    // Добавляем контекст предыдущих insights если есть
    const previousInsights = previousContext?.insights
        ? `\nPREVIOUS INSIGHTS FROM THIS SESSION:\n${previousContext.insights.map((i: any) => `- ${i.content}`).join('\n')}\n`
        : '';

    // Специальные инструкции в зависимости от типа задачи
    const taskInstructions = {
        [TASK_TYPES.CREATION]: `
CREATION TASK DETECTED:
- Generate COMPLETE content, not descriptions
- Use document context as reference but don't limit yourself
- Apply professional formatting
- Include all necessary sections and details
- Make it ready for immediate use`,

        [TASK_TYPES.ANALYSIS]: `
ANALYSIS TASK DETECTED:
- Provide deep, multi-layered analysis
- Use all available document context
- Identify patterns, risks, and opportunities
- Include quantitative analysis where possible
- Provide specific, actionable recommendations`,

        [TASK_TYPES.CRITICAL_REVIEW]: `
CRITICAL REVIEW TASK DETECTED:
- Identify ALL risks and red flags
- Question assumptions and find gaps
- Verify data consistency
- Propose mitigation strategies
- Be direct about problems found`,

        [TASK_TYPES.SUMMARY]: `
SUMMARY TASK DETECTED:
- Create concise but comprehensive summary
- Highlight key points and decisions
- Include important numbers and dates
- Note critical risks or actions required`,

        [TASK_TYPES.HYBRID]: `
HYBRID TASK DETECTED:
- Combine document analysis with creative solutions
- Use context as foundation for recommendations
- Go beyond the documents when helpful`
    };

    return `${roleContext}${previousInsights}

AVAILABLE DOCUMENT CONTEXT:
${contextChunks || 'No specific document context provided. Use general knowledge and creativity.'}

---

USER REQUEST:
${question}

TASK TYPE: ${taskType}
${taskInstructions[taskType]}

RESPONSE REQUIREMENTS:
1. Return valid JSON as specified in system prompt
2. For creative tasks (emails, letters, reports), write COMPLETE content in the answer field
3. Aim for comprehensive responses (500-2000+ words for complex tasks)
4. Include specific examples and step-by-step details
5. Identify insights with importance ratings
6. Suggest strategic follow-up questions
7. Note any data gaps or assumptions made
8. Apply role perspective if specified for deeper expertise

Remember: Don't describe what you would write - ACTUALLY WRITE IT.`;
}

// Функция для генерации полных документов
export function buildDocumentCreationPrompt(
    documentType: string,
    requirements: string,
    context: string,
    role?: string
): string {
    const roleContext = role && ROLE_PROMPTS[role as keyof typeof ROLE_PROMPTS] ? ROLE_PROMPTS[role as keyof typeof ROLE_PROMPTS] : '';

    return `${roleContext}

TASK: Create a complete ${documentType}

REQUIREMENTS:
${requirements}

CONTEXT & BACKGROUND:
${context}

INSTRUCTIONS:
1. Create a COMPLETE, professional document
2. Use appropriate structure and formatting
3. Include all necessary sections
4. Make it ready for immediate use
5. Apply role expertise if specified

OUTPUT: Return the complete document in the answer field of the JSON response.
Do not describe the document - write the actual full document.`;
}

// Функция для критического анализа с расширенными метриками
export function buildCriticalAnalysisPrompt(
    documents: string[],
    role: string = 'analyst',
    focusAreas?: string[]
): string {
    const roleContext = ROLE_PROMPTS[role as keyof typeof ROLE_PROMPTS] || ROLE_PROMPTS.analyst;
    const focus = focusAreas ? `\nSPECIFIC FOCUS AREAS:\n${focusAreas.join('\n')}` : '';

    return `${roleContext}${focus}

DOCUMENTS FOR CRITICAL ANALYSIS:
${documents.map((doc, i) => `\n--- Document ${i + 1} ---\n${doc}`).join('\n')}

COMPREHENSIVE ANALYSIS REQUIRED:
1. Executive Summary (3-5 sentences)
2. Key Findings:
   - Patterns and trends
   - Anomalies and outliers
   - Contradictions between sources
3. Risk Assessment:
   - Critical risks (with probability and impact)
   - Risk mitigation strategies
4. Opportunities:
   - Quick wins (< 1 month)
   - Strategic opportunities (3-12 months)
   - Long-term potential
5. Metrics & KPIs:
   - Current performance
   - Benchmarks and gaps
   - Recommended targets
6. Data Quality Assessment:
   - Completeness (%)
   - Reliability concerns
   - Missing critical information
7. Recommendations:
   - Immediate actions (this week)
   - Short-term plan (1 month)
   - Strategic roadmap (3-6 months)
8. Dependencies and Constraints

Return comprehensive JSON with all sections filled.`;
}

// Функция для автоматического саммари при загрузке документа
export function buildAutoSummaryPrompt(text: string, docName: string): string {
    return `Analyze this newly uploaded document and create a comprehensive summary.

Document: ${docName}
Content (first 5000 chars): ${text.substring(0, 5000)}

Create a structured summary:
{
  "executive_summary": "2-3 sentence overview",
  "document_type": "report|email|contract|presentation|other",
  "key_points": [
    {"point": "key finding", "importance": "high|medium|low"}
  ],
  "metrics": [
    {"metric": "name", "value": "amount", "context": "explanation"}
  ],
  "dates": [
    {"date": "YYYY-MM-DD", "event": "what happens", "importance": "high|medium|low"}
  ],
  "people_organizations": [
    {"name": "entity", "role": "their role", "relevance": "why important"}
  ],
  "risks": [
    {"risk": "description", "severity": "high|medium|low", "likelihood": "high|medium|low"}
  ],
  "opportunities": [
    {"opportunity": "description", "potential": "high|medium|low"}
  ],
  "action_items": [
    {"action": "what needs to be done", "owner": "who", "deadline": "when"}
  ],
  "questions_for_review": [
    "Critical question that needs clarification"
  ]
}`;
}

// Экспорт типов для TypeScript
export interface InsightType {
    type: 'risk' | 'opportunity' | 'recommendation' | 'gap';
    content: string;
    importance: number;
    action_required?: string;
}

export interface ResponseFormat {
    answer: string;
    citations: Array<{
        doc_id: string;
        chunk_index: number;
        similarity: number;
        quote: string;
    }>;
    insights: InsightType[];
    follow_up_questions: string[];
    confidence_level: 'high' | 'medium' | 'low';
    data_gaps?: string[];
}