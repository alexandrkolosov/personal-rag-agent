import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        // Создаем Supabase клиент с service role для сервера
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Ошибка конфигурации сервера' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Получаем токен из заголовка Authorization
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json(
                { error: 'Не авторизован - отсутствует токен' },
                { status: 401 }
            );
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Не авторизован' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { question } = body;

        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return NextResponse.json(
                { error: 'Вопрос не предоставлен или пустой' },
                { status: 400 }
            );
        }

        if (question.length > 1000) {
            return NextResponse.json(
                { error: 'Вопрос слишком длинный (максимум 1000 символов)' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            answer: 'Функция чата будет реализована на следующем этапе (Prompt B). Сейчас это заглушка.',
            question: question,
        });

    } catch (error) {
        console.error('Ask error:', error);
        return NextResponse.json(
            { error: `Внутренняя ошибка сервера: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` },
            { status: 500 }
        );
    }
}