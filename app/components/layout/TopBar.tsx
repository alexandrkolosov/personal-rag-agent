import React from 'react';
import { AI_ROLES } from '../modals/ProjectModal';

interface TopBarProps {
    projects: any[];
    activeProject: any;
    user: any;
    onProjectChange: (projectId: string) => void;
    onNewProject: () => void;
    onExport: (format: 'markdown' | 'csv' | 'docx') => void;
    onLogout: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
    projects,
    activeProject,
    user,
    onProjectChange,
    onNewProject,
    onExport,
    onLogout
}) => {
    return (
        <div className="bg-white border-b border-warm-200 px-4 py-3">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                {/* Project Selector */}
                <div className="flex items-center gap-4">
                    <select
                        value={activeProject?.id || ''}
                        onChange={(e) => onProjectChange(e.target.value)}
                        className="bg-white text-warm-800 px-3 py-1.5 rounded-lg border border-warm-200 focus:border-accent-400 focus:outline-none transition-colors text-sm"
                    >
                        <option value="">Выберите проект</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>
                                📁 {p.name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={onNewProject}
                        className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-1.5 rounded-lg text-sm font-normal transition-colors"
                    >
                        ➕ Новый проект
                    </button>

                    {activeProject && (
                        <div className="flex items-center gap-2 ml-4 text-warm-600">
                            <span className="text-sm">Роль AI:</span>
                            <span className="text-warm-800 font-semibold">
                                {AI_ROLES[activeProject.role as keyof typeof AI_ROLES]?.split(' - ')[0] || activeProject.role}
                            </span>
                        </div>
                    )}
                </div>

                {/* Export buttons and logout */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onExport('markdown')}
                            className="text-warm-500 hover:text-warm-700 px-3 py-1 transition text-xs"
                            title="Экспорт в Markdown"
                        >
                            📝 MD
                        </button>
                        <button
                            onClick={() => onExport('csv')}
                            className="text-warm-500 hover:text-warm-700 px-3 py-1 transition text-xs"
                            title="Экспорт в CSV"
                        >
                            📊 CSV
                        </button>
                        <button
                            onClick={() => onExport('docx')}
                            className="text-warm-500 hover:text-warm-700 px-3 py-1 transition text-xs"
                            title="Экспорт в Word"
                        >
                            📄 Word
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-warm-500">{user.email}</span>
                        <button
                            onClick={onLogout}
                            className="text-red-500 hover:text-red-600 transition text-sm"
                        >
                            Выйти
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopBar;
