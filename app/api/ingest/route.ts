import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        console.log('API /api/ingest вызван');

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

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'Файл не предоставлен' },
                { status: 400 }
            );
        }

        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];

        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Неподдерживаемый тип файла. Разрешены: PDF, DOCX, TXT' },
                { status: 400 }
            );
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'Размер файла превышает 10MB' },
                { status: 400 }
            );
        }

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `${user.id}/${timestamp}-${safeName}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return NextResponse.json(
                { error: `Ошибка загрузки в хранилище: ${uploadError.message}` },
                { status: 500 }
            );
        }

        // Пока не парсим документ - добавим позже
        const parsedText = 'Парсинг будет добавлен позже';

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
            console.error('Database insert error:', dbError);
            await supabase.storage.from('documents').remove([storagePath]);

            return NextResponse.json(
                { error: `Ошибка сохранения в БД: ${dbError.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            filename: file.name,
            documentId: docData.id,
            storagePath: storagePath,
        });

    } catch (error) {
        console.error('Ingest error:', error);
        return NextResponse.json(
            { error: `Внутренняя ошибка сервера: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` },
            { status: 500 }
        );
    }
}