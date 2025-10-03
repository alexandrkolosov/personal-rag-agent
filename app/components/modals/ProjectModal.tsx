import React from 'react';

const AI_ROLES = {
    analyst: "🧠 Аналитик - критический анализ и поиск рисков",
    cfo: "💰 CFO - фокус на финансах и метриках",
    lawyer: "⚖️ Юрист - правовые риски и формулировки",
    investor: "🚀 Инвестор - оценка потенциала и масштабируемости",
    custom: "✏️ Своя роль"
};

interface ProjectModalProps {
    show: boolean;
    projectName: string;
    selectedRole: string;
    customRole: string;
    onProjectNameChange: (name: string) => void;
    onRoleChange: (role: string) => void;
    onCustomRoleChange: (role: string) => void;
    onCreate: () => void;
    onClose: () => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({
    show,
    projectName,
    selectedRole,
    customRole,
    onProjectNameChange,
    onRoleChange,
    onCustomRoleChange,
    onCreate,
    onClose
}) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96 shadow-lg border border-warm-200">
                <h2 className="text-xl mb-4 text-warm-800">Новый проект</h2>

                <input
                    type="text"
                    placeholder="Название проекта"
                    value={projectName}
                    onChange={(e) => onProjectNameChange(e.target.value)}
                    className="w-full bg-white border border-warm-200 text-warm-800 px-3 py-2 rounded-lg mb-3 focus:border-accent-400 focus:outline-none text-sm"
                />

                <label className="block mb-3">
                    <span className="text-sm text-warm-600">Роль AI:</span>
                    <select
                        value={selectedRole}
                        onChange={(e) => onRoleChange(e.target.value)}
                        className="w-full bg-white border border-warm-200 text-warm-800 px-3 py-2 rounded-lg mt-1 focus:border-accent-400 focus:outline-none text-sm"
                    >
                        {Object.entries(AI_ROLES).map(([key, value]) => (
                            <option key={key} value={key}>{value}</option>
                        ))}
                    </select>
                </label>

                {selectedRole === 'custom' && (
                    <textarea
                        placeholder="Опишите роль AI..."
                        value={customRole}
                        onChange={(e) => onCustomRoleChange(e.target.value)}
                        className="w-full bg-white border border-warm-200 text-warm-800 px-3 py-2 rounded-lg mb-3 h-20 focus:border-accent-400 focus:outline-none text-sm"
                    />
                )}

                <div className="flex gap-2">
                    <button
                        onClick={onCreate}
                        disabled={!projectName.trim()}
                        className="flex-1 bg-accent-500 hover:bg-accent-600 disabled:bg-warm-300 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-normal transition-colors"
                    >
                        Создать
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-warm-300 hover:bg-warm-400 text-warm-700 py-2 rounded-lg text-sm font-normal transition-colors"
                    >
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectModal;
export { AI_ROLES };
