import React from 'react';

interface SearchSettingsPanelProps {
    webSearchEnabled: boolean;
    comparisonMode: boolean;
    forceWebSearch: boolean;
    showAdvancedSearch: boolean;
    searchMode: 'web' | 'academic' | 'sec';
    domainFilter: string;
    clearingCache: boolean;
    onWebSearchToggle: (checked: boolean) => void;
    onComparisonModeToggle: (checked: boolean) => void;
    onForceWebSearchToggle: (checked: boolean) => void;
    onAdvancedSearchToggle: () => void;
    onSearchModeChange: (mode: 'web' | 'academic' | 'sec') => void;
    onDomainFilterChange: (filter: string) => void;
    onClearCache: () => void;
}

const SearchSettingsPanel: React.FC<SearchSettingsPanelProps> = ({
    webSearchEnabled,
    comparisonMode,
    forceWebSearch,
    showAdvancedSearch,
    searchMode,
    domainFilter,
    clearingCache,
    onWebSearchToggle,
    onComparisonModeToggle,
    onForceWebSearchToggle,
    onAdvancedSearchToggle,
    onSearchModeChange,
    onDomainFilterChange,
    onClearCache
}) => {
    return (
        <div className="bg-warm-50 border-b border-warm-200 px-4 py-2">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-wrap">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={webSearchEnabled}
                                onChange={(e) => onWebSearchToggle(e.target.checked)}
                                className="rounded"
                            />
                            <span>🌐 Web Search</span>
                        </label>

                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={comparisonMode}
                                onChange={(e) => onComparisonModeToggle(e.target.checked)}
                                className="rounded"
                            />
                            <span>📊 Сравнение документов</span>
                        </label>

                        {webSearchEnabled && (
                            <>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={forceWebSearch}
                                        onChange={(e) => onForceWebSearchToggle(e.target.checked)}
                                        className="rounded"
                                    />
                                    <span>Всегда искать</span>
                                </label>

                                <button
                                    onClick={onAdvancedSearchToggle}
                                    className="text-sm text-accent-600 hover:text-accent-700 transition"
                                >
                                    ⚙️ {showAdvancedSearch ? 'Скрыть' : 'Расширенные'}
                                </button>
                            </>
                        )}

                        {/* Clear Memory Button */}
                        <button
                            onClick={onClearCache}
                            disabled={clearingCache}
                            className="text-xs px-3 py-1 bg-warm-200 hover:bg-warm-300 disabled:bg-warm-100 disabled:text-warm-400 text-warm-700 rounded-lg transition-colors flex items-center gap-1"
                            title="Очистить кэш поиска для получения свежих результатов"
                        >
                            {clearingCache ? (
                                <>🔄 Очистка...</>
                            ) : (
                                <>🧹 Очистить память</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Advanced Settings */}
                {webSearchEnabled && showAdvancedSearch && (
                    <div className="mt-2 pt-2 border-t border-warm-200 flex gap-4 flex-wrap items-center">
                        {/* Search Mode */}
                        <div className="flex items-center gap-2 text-xs">
                            <label className="text-warm-600">Режим:</label>
                            <select
                                value={searchMode}
                                onChange={(e) => onSearchModeChange(e.target.value as 'web' | 'academic' | 'sec')}
                                className="bg-white text-warm-800 px-2 py-1 rounded-lg border border-warm-200 text-xs"
                            >
                                <option value="web">🌐 Web (Общий)</option>
                                <option value="academic">🎓 Academic (Научный)</option>
                                <option value="sec">📊 SEC (Финансовые отчеты)</option>
                            </select>
                        </div>

                        {/* Domain Filter */}
                        <div className="flex items-center gap-2 text-sm flex-1 min-w-[300px]">
                            <label className="text-warm-600">Домены:</label>
                            <input
                                type="text"
                                placeholder="example.com, scholar.google.com"
                                value={domainFilter}
                                onChange={(e) => onDomainFilterChange(e.target.value)}
                                className="flex-1 bg-white text-warm-800 px-2 py-1 rounded-lg border border-warm-200 text-xs placeholder-warm-400"
                            />
                        </div>

                        {/* Domain Presets */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => onDomainFilterChange('scholar.google.com, arxiv.org, nature.com, science.org')}
                                className="text-xs bg-warm-100 hover:bg-warm-200 text-warm-700 px-2 py-1 rounded-lg transition-colors"
                                title="Научные источники"
                            >
                                🎓 Наука
                            </button>
                            <button
                                onClick={() => onDomainFilterChange('sec.gov, edgar.gov')}
                                className="text-xs bg-warm-100 hover:bg-warm-200 text-warm-700 px-2 py-1 rounded-lg transition-colors"
                                title="SEC финансовые отчеты"
                            >
                                📊 SEC
                            </button>
                            <button
                                onClick={() => onDomainFilterChange('reuters.com, bloomberg.com, ft.com')}
                                className="text-xs bg-warm-100 hover:bg-warm-200 text-warm-700 px-2 py-1 rounded-lg transition-colors"
                                title="Новостные источники"
                            >
                                📰 Новости
                            </button>
                            <button
                                onClick={() => onDomainFilterChange('')}
                                className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg transition-colors"
                                title="Очистить фильтр"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchSettingsPanel;
