import React from 'react';
import { exportComparisonToMarkdown, downloadFile } from '@/lib/exportUtils';

interface ComparisonResultsProps {
    comparison: any;
    onClose: () => void;
}

const ComparisonResults: React.FC<ComparisonResultsProps> = ({ comparison, onClose }) => {
    if (!comparison) return null;

    const { documents, differences, similarities, summary, recommendations, metadata, comparisonType } = comparison;

    // Group differences by severity
    const criticalDiffs = differences.filter((d: any) => d.severity === 'critical');
    const majorDiffs = differences.filter((d: any) => d.severity === 'major');
    const minorDiffs = differences.filter((d: any) => d.severity === 'minor');

    // Export handler
    const handleExport = () => {
        const markdown = exportComparisonToMarkdown(comparison);
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `comparison_${timestamp}.md`;
        downloadFile(markdown, filename, 'text/markdown');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">📊 Результаты сравнения</h2>
                        <p className="text-sm text-gray-400 mt-1">
                            {comparisonType === 'ai_powered' ? '🤖 AI-powered анализ' : '⚡ Быстрое семантическое сравнение'} •
                            Время: {(metadata.executionTime / 1000).toFixed(1)}с
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExport}
                            className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 rounded border border-blue-400 hover:border-blue-300"
                            title="Экспорт в Markdown"
                        >
                            📥 Экспорт
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white text-2xl"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Documents being compared */}
                <div className="p-4 border-b border-gray-700">
                    <h3 className="font-semibold mb-2">Сравниваемые документы:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {documents.map((doc: any, idx: number) => (
                            <div key={doc.id} className="bg-gray-700 rounded p-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-medium">#{idx + 1} {doc.filename}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Тип: {doc.docType} • Секций: {doc.sectionsCount} • Чанков: {doc.chunksCount}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary */}
                <div className="p-4 border-b border-gray-700 bg-gray-750">
                    <h3 className="font-semibold mb-2">📝 Краткое резюме:</h3>
                    <p className="text-gray-300">{summary}</p>
                    <div className="mt-3 flex gap-4 text-sm">
                        <span className="text-red-400">🔴 Критичных: {metadata.criticalDifferences}</span>
                        <span className="text-yellow-400">🟡 Всего различий: {metadata.totalDifferences}</span>
                        <span className="text-green-400">✅ Схожесть: {(metadata.similarityScore * 100).toFixed(1)}%</span>
                    </div>
                </div>

                {/* AI Recommendations */}
                {recommendations && recommendations.length > 0 && (
                    <div className="p-4 border-b border-gray-700 bg-blue-900 bg-opacity-20">
                        <h3 className="font-semibold mb-2">💡 Рекомендации AI:</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            {recommendations.map((rec: string, idx: number) => (
                                <li key={idx} className="text-gray-300">{rec}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Differences */}
                <div className="p-4 space-y-4">
                    <h3 className="font-semibold text-lg">🔍 Найденные различия:</h3>

                    {criticalDiffs.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-red-400 mb-2">🔴 Критические ({criticalDiffs.length}):</h4>
                            <div className="space-y-2">
                                {criticalDiffs.map((diff: any, idx: number) => (
                                    <DifferenceCard key={idx} diff={diff} documents={documents} />
                                ))}
                            </div>
                        </div>
                    )}

                    {majorDiffs.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-orange-400 mb-2">🟠 Важные ({majorDiffs.length}):</h4>
                            <div className="space-y-2">
                                {majorDiffs.map((diff: any, idx: number) => (
                                    <DifferenceCard key={idx} diff={diff} documents={documents} />
                                ))}
                            </div>
                        </div>
                    )}

                    {minorDiffs.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-yellow-400 mb-2">🟡 Незначительные ({minorDiffs.length}):</h4>
                            <div className="space-y-2">
                                {minorDiffs.slice(0, 10).map((diff: any, idx: number) => (
                                    <DifferenceCard key={idx} diff={diff} documents={documents} />
                                ))}
                                {minorDiffs.length > 10 && (
                                    <p className="text-sm text-gray-400 italic">
                                        ... и еще {minorDiffs.length - 10} незначительных различий
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Similarities */}
                {similarities && similarities.length > 0 && (
                    <div className="p-4 border-t border-gray-700">
                        <h3 className="font-semibold text-lg mb-2">✅ Схожие части ({similarities.length}):</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {similarities.slice(0, 6).map((sim: any, idx: number) => (
                                <div key={idx} className="bg-green-900 bg-opacity-20 rounded p-2">
                                    <p className="text-sm">
                                        <span className="font-medium">{sim.location}</span>
                                        <span className="text-xs text-gray-400 ml-2">
                                            ({(sim.similarityScore * 100).toFixed(1)}% схожесть)
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">{sim.description}</p>
                                </div>
                            ))}
                        </div>
                        {similarities.length > 6 && (
                            <p className="text-sm text-gray-400 italic mt-2">
                                ... и еще {similarities.length - 6} схожих частей
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Component for displaying a single difference
const DifferenceCard: React.FC<{ diff: any; documents: any[] }> = ({ diff, documents }) => {
    const severityColors = {
        critical: 'border-red-500 bg-red-900 bg-opacity-20',
        major: 'border-orange-500 bg-orange-900 bg-opacity-20',
        minor: 'border-yellow-500 bg-yellow-900 bg-opacity-20'
    };

    const typeIcons = {
        clause_missing: '❌',
        value_different: '⚠️',
        term_changed: '🔄',
        structure_different: '🔀'
    };

    return (
        <div className={`border-l-4 rounded p-3 ${severityColors[diff.severity as keyof typeof severityColors]}`}>
            <p className="font-medium mb-1">
                {typeIcons[diff.type as keyof typeof typeIcons] || '📌'} {diff.description}
            </p>

            {(diff.content1 || diff.content2) && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {diff.content1 && (
                        <div className="bg-gray-700 rounded p-2">
                            <p className="text-xs text-gray-400 mb-1">
                                {documents[0]?.filename || 'Документ 1'}
                                {diff.location?.document1 && ` • ${diff.location.document1}`}
                            </p>
                            <p className="text-gray-300 italic">{diff.content1}</p>
                        </div>
                    )}
                    {diff.content2 && (
                        <div className="bg-gray-700 rounded p-2">
                            <p className="text-xs text-gray-400 mb-1">
                                {documents[1]?.filename || 'Документ 2'}
                                {diff.location?.document2 && ` • ${diff.location.document2}`}
                            </p>
                            <p className="text-gray-300 italic">{diff.content2}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ComparisonResults;
