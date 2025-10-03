import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const { format, content, filename } = await request.json();

    if (format === 'markdown') {
        const markdown = `# ${filename}\n\n${content}`;
        return new Response(markdown, {
            headers: {
                'Content-Type': 'text/markdown',
                'Content-Disposition': `attachment; filename="${filename}.md"`
            }
        });
    }

    if (format === 'csv') {
        // Простая CSV конвертация
        const csv = `"Content"\n"${content}"`;
        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${filename}.csv"`
            }
        });
    }

    // Для Word пока возвращаем HTML
    if (format === 'docx') {
        const html = `<html><body><h1>${filename}</h1>${content}</body></html>`;
        return new Response(html, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${filename}.docx"`
            }
        });
    }
}