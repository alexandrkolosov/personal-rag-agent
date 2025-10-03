// lib/exportUtils.ts
// Utilities for exporting chat history and comparison results

import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } from 'docx';

/**
 * Export chat messages to Markdown format
 */
export function exportToMarkdown(messages: any[], projectName?: string): string {
  const timestamp = new Date().toLocaleString('ru-RU');

  let md = `# Экспорт чата${projectName ? `: ${projectName}` : ''}\n\n`;
  md += `**Дата экспорта:** ${timestamp}\n`;
  md += `**Сообщений:** ${messages.length}\n\n`;
  md += `---\n\n`;

  messages.forEach((msg, index) => {
    const role = msg.role === 'user' ? '👤 Пользователь' : '🤖 Ассистент';
    md += `## ${role}\n\n`;
    md += `${msg.content}\n\n`;

    // Add sources if available
    if (msg.role === 'assistant' && msg.sources && msg.sources.length > 0) {
      md += `### Источники из документов:\n\n`;
      msg.sources.forEach((s: any, i: number) => {
        md += `${i + 1}. ${s.quote?.substring(0, 150)}...\n`;
      });
      md += `\n`;
    }

    // Add web sources
    if (msg.role === 'assistant' && msg.webSources && msg.webSources.length > 0) {
      md += `### Web источники:\n\n`;
      msg.webSources.forEach((s: any, i: number) => {
        md += `${i + 1}. [${s.title || 'Источник'}](${s.url})\n`;
      });
      md += `\n`;
    }

    md += `---\n\n`;
  });

  return md;
}

/**
 * Export chat messages to CSV format
 */
export function exportToCSV(messages: any[], projectName?: string): string {
  const timestamp = new Date().toLocaleString('ru-RU');

  let csv = `"Проект","${projectName || 'Без проекта'}"\n`;
  csv += `"Дата экспорта","${timestamp}"\n`;
  csv += `"Сообщений","${messages.length}"\n\n`;
  csv += `"#","Роль","Содержание","Источники","Web источники"\n`;

  messages.forEach((msg, index) => {
    const role = msg.role === 'user' ? 'Пользователь' : 'Ассистент';
    const content = msg.content.replace(/"/g, '""'); // Escape quotes

    let sources = '';
    if (msg.sources && msg.sources.length > 0) {
      sources = msg.sources.map((s: any) => s.quote?.substring(0, 100)).join(' | ');
    }

    let webSources = '';
    if (msg.webSources && msg.webSources.length > 0) {
      webSources = msg.webSources.map((s: any) => s.url).join(' | ');
    }

    csv += `"${index + 1}","${role}","${content}","${sources}","${webSources}"\n`;
  });

  return csv;
}

/**
 * Export comparison results to Markdown
 */
export function exportComparisonToMarkdown(comparison: any): string {
  const timestamp = new Date().toLocaleString('ru-RU');

  let md = `# Результаты сравнения документов\n\n`;
  md += `**Дата:** ${timestamp}\n`;
  md += `**Тип сравнения:** ${comparison.comparisonType === 'ai_powered' ? 'AI-анализ' : 'Семантическое'}\n`;
  md += `**Схожесть:** ${(comparison.metadata.similarityScore * 100).toFixed(1)}%\n\n`;

  // Documents
  md += `## Сравниваемые документы\n\n`;
  comparison.documents.forEach((doc: any, idx: number) => {
    md += `${idx + 1}. **${doc.filename}** (${doc.docType}, ${doc.chunksCount} чанков)\n`;
  });
  md += `\n`;

  // Summary
  md += `## Резюме\n\n${comparison.summary}\n\n`;

  // Recommendations
  if (comparison.recommendations && comparison.recommendations.length > 0) {
    md += `## Рекомендации\n\n`;
    comparison.recommendations.forEach((rec: string, idx: number) => {
      md += `${idx + 1}. ${rec}\n`;
    });
    md += `\n`;
  }

  // Differences
  if (comparison.differences && comparison.differences.length > 0) {
    md += `## Различия (${comparison.differences.length})\n\n`;

    const critical = comparison.differences.filter((d: any) => d.severity === 'critical');
    const major = comparison.differences.filter((d: any) => d.severity === 'major');
    const minor = comparison.differences.filter((d: any) => d.severity === 'minor');

    if (critical.length > 0) {
      md += `### 🔴 Критические (${critical.length})\n\n`;
      critical.forEach((diff: any, idx: number) => {
        md += `${idx + 1}. **${diff.description}**\n`;
        if (diff.content1) md += `   - Документ 1: ${diff.content1.substring(0, 200)}...\n`;
        if (diff.content2) md += `   - Документ 2: ${diff.content2.substring(0, 200)}...\n`;
        md += `\n`;
      });
    }

    if (major.length > 0) {
      md += `### 🟠 Важные (${major.length})\n\n`;
      major.forEach((diff: any, idx: number) => {
        md += `${idx + 1}. ${diff.description}\n`;
      });
      md += `\n`;
    }

    if (minor.length > 0) {
      md += `### 🟡 Незначительные (${minor.length})\n\n`;
      minor.slice(0, 10).forEach((diff: any, idx: number) => {
        md += `${idx + 1}. ${diff.description}\n`;
      });
      if (minor.length > 10) {
        md += `\n... и еще ${minor.length - 10} различий\n`;
      }
      md += `\n`;
    }
  }

  // Similarities
  if (comparison.similarities && comparison.similarities.length > 0) {
    md += `## ✅ Схожие части (${comparison.similarities.length})\n\n`;
    comparison.similarities.slice(0, 10).forEach((sim: any, idx: number) => {
      md += `${idx + 1}. ${sim.location} (${(sim.similarityScore * 100).toFixed(1)}% схожесть)\n`;
    });
    if (comparison.similarities.length > 10) {
      md += `\n... и еще ${comparison.similarities.length - 10} схожих частей\n`;
    }
  }

  return md;
}

/**
 * Export chat messages to Word (.docx) format
 */
export async function exportToDocx(messages: any[], projectName?: string): Promise<Blob> {
  const timestamp = new Date().toLocaleString('ru-RU');

  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: `Экспорт чата${projectName ? `: ${projectName}` : ''}`,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  );

  // Metadata
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Дата экспорта: ', bold: true }),
        new TextRun(timestamp)
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Сообщений: ', bold: true }),
        new TextRun(messages.length.toString())
      ],
      spacing: { after: 400 }
    })
  );

  // Messages
  messages.forEach((msg, index) => {
    const role = msg.role === 'user' ? '👤 Пользователь' : '🤖 Ассистент';

    // Message header
    children.push(
      new Paragraph({
        text: role,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 }
      })
    );

    // Message content - split by lines to preserve formatting
    const contentLines = msg.content.split('\n');
    contentLines.forEach((line: string) => {
      children.push(
        new Paragraph({
          text: line,
          spacing: { after: 100 }
        })
      );
    });

    // Sources from documents
    if (msg.role === 'assistant' && msg.sources && msg.sources.length > 0) {
      children.push(
        new Paragraph({
          text: 'Источники из документов:',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        })
      );

      msg.sources.forEach((s: any, i: number) => {
        children.push(
          new Paragraph({
            text: `${i + 1}. ${s.quote?.substring(0, 150)}...`,
            spacing: { after: 100 },
            bullet: { level: 0 }
          })
        );
      });
    }

    // Web sources
    if (msg.role === 'assistant' && msg.webSources && msg.webSources.length > 0) {
      children.push(
        new Paragraph({
          text: 'Web источники:',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        })
      );

      msg.webSources.forEach((s: any, i: number) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun(`${i + 1}. ${s.title || 'Источник'}: `),
              new TextRun({ text: s.url, underline: { type: UnderlineType.SINGLE }, color: '0563C1' })
            ],
            spacing: { after: 100 },
            bullet: { level: 0 }
          })
        );
      });
    }
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  });

  // Import Packer dynamically to avoid SSR issues
  const { Packer } = await import('docx');
  return await Packer.toBlob(doc);
}

/**
 * Trigger download of a file in the browser
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
