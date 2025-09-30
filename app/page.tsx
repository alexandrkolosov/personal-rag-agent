'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase-browser';
import { useRouter } from 'next/navigation';

const supabase = createClient();

// Роли для AI
const AI_ROLES = {
    analyst: "🧠 Аналитик - критический анализ и поиск рисков",
    cfo: "💰 CFO - фокус на финансах и метриках",
    lawyer: "⚖️ Юрист - правовые риски и формулировки",
    investor: "🚀 Инвестор - оценка потенциала и масштабируемости",
    custom: "✏️ Своя роль"
};

export default function Home() {
    // Основные стейты пользователя
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const router = useRouter();

    // Стейты проектов
    const [projects, setProjects] = useState<any[]>([]);
    const [activeProject, setActiveProject] = useState<any>(null);
    const [newProjectName, setNewProjectName] = useState('');
    const [selectedRole, setSelectedRole] = useState('analyst');
    const [customRole, setCustomRole] = useState('');
    const [showProjectModal, setShowProjectModal] = useState(false);

    // Стейты документов и чата
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [asking, setAsking] = useState(false);
    const [documents, setDocuments] = useState<any[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [autoSummary, setAutoSummary] = useState(true);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

    // Получение пользователя и сессии
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            if (!session) {
                router.push('/login');
            } else {
                loadProjects(session.user);
                loadDocuments(session.user);
                loadChatHistory(session.user);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (!session) {
                router.push('/login');
            } else {
                loadProjects(session.user);
                loadDocuments(session.user);
                loadChatHistory(session.user);
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    // Загрузка проектов (создаем таблицу projects если её нет)
    const loadProjects = async (currentUser: any) => {
        if (!currentUser) return;

        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (!error) {
                setProjects(data || []);
                if (data?.length && !activeProject) {
                    setActiveProject(data[0]);
                }
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    };

    // Загрузка документов
    const loadDocuments = async (currentUser?: any) => {
        const userId = currentUser?.id || user?.id;
        if (!userId) return;

        setLoadingDocs(true);
        try {
            let query = supabase
                .from('documents')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            // Фильтруем по проекту если выбран
            if (activeProject) {
                query = query.eq('project_id', activeProject.id);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error loading documents:', error);
            } else {
                setDocuments(data || []);
            }
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoadingDocs(false);
        }
    };

    // Загрузка истории чата
    const loadChatHistory = async (currentUser?: any) => {
        const userId = currentUser?.id || user?.id;
        if (!userId) return;

        try {
            let query = supabase
                .from('messages')
                .select('role, content, metadata, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: true })
                .limit(50);

            // Фильтруем по проекту если выбран
            if (activeProject) {
                query = query.eq('project_id', activeProject.id);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error loading chat history:', error);
            } else if (data && data.length > 0) {
                setMessages(data.map(msg => ({
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content,
                    sources: msg.metadata?.sources,
                    insights: msg.metadata?.insights,
                    follow_up_questions: msg.metadata?.follow_up_questions
                })));

                // Устанавливаем предложенные вопросы из последнего ответа
                const lastAssistantMsg = data.filter(m => m.role === 'assistant').pop();
                if (lastAssistantMsg?.metadata?.follow_up_questions) {
                    setSuggestedQuestions(lastAssistantMsg.metadata.follow_up_questions);
                }
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    };

    // Перезагрузка данных при смене проекта
    useEffect(() => {
        if (activeProject && user) {
            loadDocuments();
            loadChatHistory();
        }
    }, [activeProject]);

    // Создание проекта
    const createProject = async () => {
        if (!newProjectName.trim() || !user) return;

        const { data, error } = await supabase
            .from('projects')
            .insert({
                user_id: user.id,
                name: newProjectName,
                role: selectedRole === 'custom' ? customRole : selectedRole
            })
            .select()
            .single();

        if (data && !error) {
            setProjects([data, ...projects]);
            setActiveProject(data);
            setShowProjectModal(false);
            setNewProjectName('');
            setSelectedRole('analyst');
            setCustomRole('');
        }
    };

    // Логаут
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    // Обработка файлов
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setUploadStatus('');
        }
    };

    // Загрузка файла
    // Загрузка файла
    const handleUpload = async () => {
        if (!file || !session) {
            setUploadStatus('Ошибка: нет файла или сессии');
            return;
        }

        if (!activeProject) {
            setUploadStatus('Ошибка: выберите или создайте проект');
            return;
        }

        const allowedTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        if (!allowedTypes.includes(file.type)) {
            setUploadStatus('Поддерживаются только DOCX и TXT файлы');
            return;
        }

        setUploading(true);
        setUploadStatus('Загрузка и обработка документа...');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', activeProject.id); // Передаем ID проекта
            formData.append('autoSummary', autoSummary.toString());

            const response = await fetch('/api/ingest', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setUploadStatus(`✅ Успешно: ${data.filename} (${data.chunksCount} фрагментов)`);
                setFile(null);
                const fileInput = document.getElementById('fileInput') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
                await loadDocuments(); // Перезагружаем список документов
            } else {
                setUploadStatus(`❌ Ошибка: ${data.error}`);
            }
        } catch (error) {
            setUploadStatus(`❌ Ошибка загрузки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        } finally {
            setUploading(false);
        }
    };

    // Удаление документа
    const handleDeleteDocument = async (docId: string) => {
        if (!confirm('Удалить этот документ? Это также удалит все связанные с ним фрагменты.')) return;

        try {
            const { error } = await supabase
                .from('documents')
                .delete()
                .eq('id', docId);

            if (error) {
                alert(`Ошибка удаления: ${error.message}`);
            } else {
                await loadDocuments();
            }
        } catch (error) {
            alert(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
    };

    // Отправка вопроса
    const handleAsk = async () => {
        if (!question.trim() || !session) return;

        setAsking(true);
        const userMessage = question;
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setQuestion('');

        try {
            const response = await fetch('/api/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    question: userMessage,
                    projectId: activeProject?.id,
                    role: activeProject?.role
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.answer,
                    sources: data.sources,
                    follow_up_questions: data.follow_up_questions
                }]);

                if (data.follow_up_questions) {
                    setSuggestedQuestions(data.follow_up_questions);
                }
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: `❌ Ошибка: ${data.error}` }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
            }]);
        } finally {
            setAsking(false);
        }
    };

    // Экспорт чата
    const exportChat = async (format: 'markdown' | 'csv' | 'docx') => {
        // TODO: Реализовать экспорт в разные форматы
        console.log(`Экспорт в формате ${format}`);
        alert(`Экспорт в ${format} будет добавлен в следующей версии`);
    };

    // Очистка чата
    const clearChat = async () => {
        if (!confirm('Очистить историю чата?')) return;

        try {
            await supabase
                .from('messages')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');
            setMessages([]);
            setSuggestedQuestions([]);
        } catch (error) {
            alert('Ошибка очистки чата');
        }
    };

    // Форматирование размера файла
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Форматирование даты
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('ru-RU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Документы текущего проекта
    const projectDocuments = activeProject
        ? documents.filter(d => d.project_id === activeProject.id)
        : [];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">Загрузка...</div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white">
            {/* Верхняя панель с проектами */}
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    {/* Селектор проектов */}
                    <div className="flex items-center gap-4">
                        <select
                            value={activeProject?.id || ''}
                            onChange={(e) => {
                                const project = projects.find(p => p.id === e.target.value);
                                setActiveProject(project);
                            }}
                            className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                        >
                            <option value="">Выберите проект</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>
                                    📁 {p.name}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={() => setShowProjectModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                        >
                            ➕ Новый проект
                        </button>

                        {activeProject && (
                            <div className="flex items-center gap-2 ml-4 text-gray-400">
                                <span>Роль AI:</span>
                                <span className="text-white font-medium">
                                    {AI_ROLES[activeProject.role]?.split(' - ')[0] || activeProject.role}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Кнопки экспорта и выход */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => exportChat('markdown')}
                                className="text-gray-400 hover:text-white px-3 py-1 transition"
                                title="Экспорт в Markdown"
                            >
                                📝 MD
                            </button>
                            <button
                                onClick={() => exportChat('csv')}
                                className="text-gray-400 hover:text-white px-3 py-1 transition"
                                title="Экспорт в CSV"
                            >
                                📊 CSV
                            </button>
                            <button
                                onClick={() => exportChat('docx')}
                                className="text-gray-400 hover:text-white px-3 py-1 transition"
                                title="Экспорт в Word"
                            >
                                📄 Word
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-400">{user.email}</span>
                            <button
                                onClick={handleLogout}
                                className="text-red-400 hover:text-red-300 transition"
                            >
                                Выйти
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Основной контент */}
            {activeProject ? (
                <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Левая панель - документы */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Загрузка файлов */}
                        <div className="bg-gray-800 rounded-lg p-4">
                            <h3 className="font-semibold mb-3">📎 Документы проекта</h3>
                            <input
                                id="fileInput"
                                type="file"
                                onChange={handleFileChange}
                                className="block w-full mb-2 text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-gray-700 file:text-white hover:file:bg-gray-600"
                                accept=".txt,.docx"
                            />
                            <button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded transition"
                            >
                                {uploading ? '⏳ Загрузка...' : '📤 Загрузить'}
                            </button>

                            {uploadStatus && (
                                <div className={`mt-2 p-2 rounded text-sm ${
                                    uploadStatus.includes('❌')
                                        ? 'bg-red-900/20 text-red-400'
                                        : 'bg-green-900/20 text-green-400'
                                }`}>
                                    {uploadStatus}
                                </div>
                            )}

                            {/* Авто-саммари при загрузке */}
                            <label className="flex items-center gap-2 mt-3 text-sm text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={autoSummary}
                                    onChange={(e) => setAutoSummary(e.target.checked)}
                                    className="rounded"
                                />
                                Создавать саммари при загрузке
                            </label>
                        </div>

                        {/* Список документов */}
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold">
                                    Файлы ({projectDocuments.length})
                                </h3>
                                <button
                                    onClick={() => loadDocuments()}
                                    disabled={loadingDocs}
                                    className="text-sm text-blue-400 hover:text-blue-300"
                                >
                                    {loadingDocs ? '⏳' : '🔄'}
                                </button>
                            </div>

                            <div className="max-h-96 overflow-y-auto space-y-2">
                                {projectDocuments.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">
                                        Документы еще не загружены
                                    </p>
                                ) : (
                                    projectDocuments.map(doc => (
                                        <div key={doc.id} className="p-2 bg-gray-700 rounded hover:bg-gray-600 transition">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">
                                                        📄 {doc.filename}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteDocument(doc.id)}
                                                    className="ml-2 text-red-400 hover:text-red-300 text-sm"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Центр - чат */}
                    <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4 flex flex-col h-[calc(100vh-140px)]">
                        {/* Контекстная строка */}
                        <div className="bg-gray-700 rounded p-2 mb-3 text-sm flex justify-between items-center">
                            <div>
                                📁 Проект: <strong>{activeProject.name}</strong> |
                                🤖 Роль: <strong>{AI_ROLES[activeProject.role]?.split(' - ')[0] || activeProject.role}</strong> |
                                📄 Документов: <strong>{projectDocuments.length}</strong>
                            </div>
                            <button
                                onClick={clearChat}
                                className="text-gray-400 hover:text-white transition"
                                title="Очистить чат"
                            >
                                🗑️
                            </button>
                        </div>

                        {/* Сообщения */}
                        <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                            {messages.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 mb-4">
                                        {projectDocuments.length > 0
                                            ? "✅ RAG активирован! Задавайте вопросы по документам"
                                            : "Загрузите документы и начните задавать вопросы"}
                                    </p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-lg ${
                                            msg.role === 'user'
                                                ? 'bg-blue-900 ml-auto max-w-[80%]'
                                                : 'bg-gray-700 mr-auto max-w-[80%]'
                                        }`}
                                    >
                                        <p className="text-sm font-semibold mb-1">
                                            {msg.role === 'user' ? '👤 Вы' : '🤖 Ассистент'}
                                        </p>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                                        {/* Показываем источники для ответов AI */}
                                        {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                                            <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-600">
                                                📌 Источники:
                                                {msg.sources.map((s: any, i: number) => (
                                                    <div key={i} className="ml-2">
                                                        • {s.quote?.substring(0, 100)}...
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Предложенные вопросы от AI */}
                        {suggestedQuestions.length > 0 && (
                            <div className="flex gap-2 mb-2 flex-wrap">
                                {suggestedQuestions.map((q, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setQuestion(q)}
                                        className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition"
                                    >
                                        💡 {q}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Ввод */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && !asking && handleAsk()}
                                placeholder="Задайте вопрос о документах..."
                                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={asking}
                            />
                            <button
                                onClick={handleAsk}
                                disabled={!question.trim() || asking}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded transition"
                            >
                                {asking ? '⏳' : '📤'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-[calc(100vh-80px)]">
                    <div className="text-center">
                        <h2 className="text-2xl mb-4">👋 Добро пожаловать!</h2>
                        <p className="text-gray-400 mb-6">Создайте первый проект для работы с документами</p>
                        <button
                            onClick={() => setShowProjectModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
                        >
                            ➕ Создать проект
                        </button>
                    </div>
                </div>
            )}

            {/* Модалка создания проекта */}
            {showProjectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg w-96">
                        <h2 className="text-xl mb-4">Новый проект</h2>

                        <input
                            type="text"
                            placeholder="Название проекта"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="w-full bg-gray-700 px-3 py-2 rounded mb-3 focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <label className="block mb-3">
                            <span className="text-sm text-gray-400">Роль AI:</span>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="w-full bg-gray-700 px-3 py-2 rounded mt-1 focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                onChange={(e) => setCustomRole(e.target.value)}
                                className="w-full bg-gray-700 px-3 py-2 rounded mb-3 h-20 focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={createProject}
                                disabled={!newProjectName.trim()}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded transition"
                            >
                                Создать
                            </button>
                            <button
                                onClick={() => {
                                    setShowProjectModal(false);
                                    setNewProjectName('');
                                    setSelectedRole('analyst');
                                    setCustomRole('');
                                }}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition"
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}