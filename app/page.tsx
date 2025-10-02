'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '../lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { useDebounce } from '../hooks/useDebounce';
import MessageItem from './components/MessageItem';

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

    // НОВОЕ: стейты для web search и уточнений
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);
    const [forceWebSearch, setForceWebSearch] = useState(false);
    const [clarificationMode, setClarificationMode] = useState<any>(null);
    const [searchMode, setSearchMode] = useState<'web' | 'academic' | 'sec'>('web');
    const [domainFilter, setDomainFilter] = useState<string>('');
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

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
    const loadProjects = useCallback(async (currentUser: any) => {
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
    }, [activeProject]);

    // Загрузка документов
    const loadDocuments = useCallback(async (currentUser?: any) => {
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
    }, [user?.id, activeProject]);

    // Загрузка истории чата
    const loadChatHistory = useCallback(async (currentUser?: any) => {
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
                // Восстанавливаем сообщения с полными метаданными
                setMessages(data.map(msg => ({
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content,
                    sources: msg.metadata?.sources,
                    webSources: msg.metadata?.webSources || [],
                    webImages: msg.metadata?.webImages || [],
                    insights: msg.metadata?.insights,
                    follow_up_questions: msg.metadata?.follow_up_questions,
                    perplexityModel: msg.metadata?.perplexityModel,
                    usedWebSearch: msg.metadata?.usedWebSearch
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
    }, [user?.id, activeProject]);

    // Перезагрузка данных при смене проекта (параллельно)
    useEffect(() => {
        if (activeProject && user) {
            // Очищаем сообщения при переключении проекта для мгновенного отклика
            setMessages([]);
            setSuggestedQuestions([]);

            // Параллельная загрузка для лучшей производительности
            Promise.all([
                loadDocuments(),
                loadChatHistory()
            ]);
        } else if (!activeProject) {
            // Если нет активного проекта, очищаем чат
            setMessages([]);
            setSuggestedQuestions([]);
        }
    }, [activeProject, user, loadDocuments, loadChatHistory]);

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
    const handleUpload = async () => {
        if (!file || !session) {
            setUploadStatus('Ошибка: нет файла или сессии');
            return;
        }

        if (!activeProject) {
            setUploadStatus('Ошибка: выберите или создайте проект');
            return;
        }

        const allowedExtensions = ['.docx', '.txt', '.xlsx', '.xls', '.csv'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

        if (!allowedExtensions.includes(fileExtension)) {
            setUploadStatus('Поддерживаются только DOCX, TXT, XLSX, XLS и CSV файлы');
            return;
        }

        setUploading(true);
        setUploadStatus('Загрузка и обработка документа...');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', activeProject.id);
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
                const fileType = data.fileType === 'Excel' ? '📊 Excel' : '📄';
                setUploadStatus(`✅ Успешно: ${fileType} ${data.filename} (${data.chunksCount} фрагментов)`);
                setFile(null);
                const fileInput = document.getElementById('fileInput') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
                await loadDocuments();
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

    // НОВОЕ: обработка уточнений
    const handleClarificationResponse = async (answers: Record<string, any>) => {
        setClarificationMode(null);
        setAsking(true);

        try {
            const response = await fetch('/api/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    question: clarificationMode.originalQuestion,
                    clarificationAnswers: answers,
                    projectId: activeProject?.id,
                    role: activeProject?.role,
                    webSearchEnabled,
                    forceWebSearch
                }),
            });

            const data = await response.json();

            if (response.ok) {
                let finalAnswer = data.answer;

                if (typeof finalAnswer === 'string' &&
                    (finalAnswer.includes('"answer"') || finalAnswer.startsWith('{'))) {
                    try {
                        const parsed = JSON.parse(finalAnswer);
                        finalAnswer = parsed.answer || finalAnswer;
                    } catch (e) {
                        console.log('Answer is plain text, using as is');
                    }
                }

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: finalAnswer,
                    sources: data.sources || [],
                    webSources: data.webSources || [],
                    webImages: data.webImages || [],
                    insights: data.insights || [],
                    follow_up_questions: data.follow_up_questions || [],
                    perplexityModel: data.perplexityModel,
                    usedWebSearch: data.usedWebSearch
                }]);

                if (data.follow_up_questions && data.follow_up_questions.length > 0) {
                    setSuggestedQuestions(data.follow_up_questions);
                }
            } else {
                const errorMessage = data.answer || data.error || 'Произошла ошибка';
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `❌ ${errorMessage}`
                }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Ошибка соединения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
            }]);
        } finally {
            setAsking(false);
        }
    };

    // Модифицированная отправка вопроса
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
                    role: activeProject?.role,
                    webSearchEnabled,
                    forceWebSearch,
                    searchMode,           // НОВОЕ
                    domainFilter          // НОВОЕ
                }),
            });

            const data = await response.json();

            // НОВОЕ: обработка режима уточнений
            if (data.mode === 'needs_clarification') {
                setClarificationMode({
                    ...data,
                    originalQuestion: userMessage
                });
                setAsking(false);
                return;
            }

            if (response.ok) {
                let finalAnswer = data.answer;

                if (typeof finalAnswer === 'string' &&
                    (finalAnswer.includes('"answer"') || finalAnswer.startsWith('{'))) {
                    try {
                        const parsed = JSON.parse(finalAnswer);
                        finalAnswer = parsed.answer || finalAnswer;
                    } catch (e) {
                        console.log('Answer is plain text, using as is');
                    }
                }

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: finalAnswer,
                    sources: data.sources || [],
                    webSources: data.webSources || [],
                    webImages: data.webImages || [],
                    insights: data.insights || [],
                    follow_up_questions: data.follow_up_questions || [],
                    perplexityModel: data.perplexityModel,
                    usedWebSearch: data.usedWebSearch
                }]);

                if (data.follow_up_questions && data.follow_up_questions.length > 0) {
                    setSuggestedQuestions(data.follow_up_questions);
                }
            } else {
                const errorMessage = data.answer || data.error || 'Произошла ошибка';
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `❌ ${errorMessage}`
                }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Ошибка соединения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
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

    // Очистка чата текущего проекта
    const clearChat = async () => {
        if (!confirm('Очистить историю чата этого проекта?')) return;

        try {
            if (activeProject) {
                // Удаляем только сообщения текущего проекта
                await supabase
                    .from('messages')
                    .delete()
                    .eq('project_id', activeProject.id)
                    .eq('user_id', user.id);
            } else {
                // Если нет активного проекта, удаляем все сообщения без project_id
                await supabase
                    .from('messages')
                    .delete()
                    .is('project_id', null)
                    .eq('user_id', user.id);
            }
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

    // Документы текущего проекта (мemoized)
    const projectDocuments = useMemo(() =>
        activeProject
            ? documents.filter(d => d.project_id === activeProject.id)
            : []
    , [activeProject, documents]);

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

            {/* НОВОЕ: Панель настроек поиска */}
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-wrap">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={webSearchEnabled}
                                    onChange={(e) => setWebSearchEnabled(e.target.checked)}
                                    className="rounded"
                                />
                                <span>🌐 Web Search</span>
                            </label>

                            {webSearchEnabled && (
                                <>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={forceWebSearch}
                                            onChange={(e) => setForceWebSearch(e.target.checked)}
                                            className="rounded"
                                        />
                                        <span>Всегда искать</span>
                                    </label>

                                    <button
                                        onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                                        className="text-sm text-blue-400 hover:text-blue-300 transition"
                                    >
                                        ⚙️ {showAdvancedSearch ? 'Скрыть' : 'Расширенные'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Расширенные настройки */}
                    {webSearchEnabled && showAdvancedSearch && (
                        <div className="mt-3 pt-3 border-t border-gray-700 flex gap-4 flex-wrap items-center">
                            {/* Режим поиска */}
                            <div className="flex items-center gap-2 text-sm">
                                <label className="text-gray-400">Режим:</label>
                                <select
                                    value={searchMode}
                                    onChange={(e) => setSearchMode(e.target.value as 'web' | 'academic' | 'sec')}
                                    className="bg-gray-700 text-white px-2 py-1 rounded border border-gray-600 text-sm"
                                >
                                    <option value="web">🌐 Web (Общий)</option>
                                    <option value="academic">🎓 Academic (Научный)</option>
                                    <option value="sec">📊 SEC (Финансовые отчеты)</option>
                                </select>
                            </div>

                            {/* Фильтр доменов */}
                            <div className="flex items-center gap-2 text-sm flex-1 min-w-[300px]">
                                <label className="text-gray-400">Домены:</label>
                                <input
                                    type="text"
                                    placeholder="example.com, scholar.google.com"
                                    value={domainFilter}
                                    onChange={(e) => setDomainFilter(e.target.value)}
                                    className="flex-1 bg-gray-700 text-white px-2 py-1 rounded border border-gray-600 text-sm placeholder-gray-500"
                                />
                            </div>

                            {/* Предустановки */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDomainFilter('scholar.google.com, arxiv.org, nature.com, science.org')}
                                    className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition"
                                    title="Научные источники"
                                >
                                    🎓 Наука
                                </button>
                                <button
                                    onClick={() => setDomainFilter('sec.gov, edgar.gov')}
                                    className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition"
                                    title="SEC финансовые отчеты"
                                >
                                    📊 SEC
                                </button>
                                <button
                                    onClick={() => setDomainFilter('reuters.com, bloomberg.com, ft.com')}
                                    className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition"
                                    title="Новостные источники"
                                >
                                    📰 Новости
                                </button>
                                <button
                                    onClick={() => setDomainFilter('')}
                                    className="text-xs bg-red-900/30 hover:bg-red-900/50 px-2 py-1 rounded transition"
                                    title="Очистить фильтр"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    )}
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
                                accept=".txt,.docx,.xlsx,.xls,.csv"
                            />
                            <div className="text-xs text-gray-400 mb-2">
                                Поддерживаются: DOCX, TXT, XLSX, XLS, CSV
                            </div>
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
                    <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4 flex flex-col h-[calc(100vh-180px)]">
                        {/* Контекстная строка */}
                        <div className="bg-gray-700 rounded p-2 mb-3 text-sm flex justify-between items-center">
                            <div>
                                📁 Проект: <strong>{activeProject.name}</strong> |
                                🤖 Роль: <strong>{AI_ROLES[activeProject.role]?.split(' - ')[0] || activeProject.role}</strong> |
                                📄 Документов: <strong>{projectDocuments.length}</strong> |
                                💬 Сообщений: <strong>{messages.length}</strong>
                                {webSearchEnabled && ' | 🌐 Web: ON'}
                            </div>
                            <button
                                onClick={clearChat}
                                className="text-gray-400 hover:text-white transition text-xs"
                                title="Очистить чат этого проекта"
                            >
                                🗑️ Очистить чат
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
                                    <MessageItem key={idx} msg={msg} />
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
                <div className="flex items-center justify-center h-[calc(100vh-120px)]">
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

            {/* НОВОЕ: Модалка уточнений */}
            {clarificationMode && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <h2 className="text-xl mb-4">Уточняющие вопросы</h2>

                        {clarificationMode.partialInsight && (
                            <div className="bg-gray-700 p-3 rounded mb-4 text-sm">
                                💡 {clarificationMode.partialInsight}
                            </div>
                        )}

                        <div className="space-y-4">
                            {clarificationMode.clarifications?.map((q: any) => (
                                <div key={q.id} className="space-y-2">
                                    <label className="block text-sm font-medium">
                                        {q.question}
                                        {q.required && <span className="text-red-400">*</span>}
                                    </label>

                                    {q.context && (
                                        <p className="text-xs text-gray-400">{q.context}</p>
                                    )}

                                    {q.type === 'select' && (
                                        <select
                                            id={q.id}
                                            className="w-full bg-gray-700 px-3 py-2 rounded"
                                        >
                                            <option value="">Выберите...</option>
                                            {q.options?.map((opt: string) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    )}

                                    {q.type === 'multiselect' && (
                                        <div className="space-y-1">
                                            {q.options?.map((opt: string) => (
                                                <label key={opt} className="flex items-center gap-2">
                                                    <input type="checkbox" value={opt} id={`${q.id}_${opt}`} />
                                                    <span className="text-sm">{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {q.type === 'text' && (
                                        <input
                                            type="text"
                                            id={q.id}
                                            className="w-full bg-gray-700 px-3 py-2 rounded"
                                        />
                                    )}

                                    {q.type === 'boolean' && (
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2">
                                                <input type="radio" name={q.id} value="true" />
                                                <span>Да</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input type="radio" name={q.id} value="false" />
                                                <span>Нет</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => {
                                    // Собираем ответы
                                    const answers: any = {};
                                    clarificationMode.clarifications?.forEach((q: any) => {
                                        if (q.type === 'multiselect') {
                                            const selected: string[] = [];
                                            q.options?.forEach((opt: string) => {
                                                const element = document.getElementById(`${q.id}_${opt}`) as HTMLInputElement;
                                                if (element?.checked) {
                                                    selected.push(opt);
                                                }
                                            });
                                            answers[q.id] = selected;
                                        } else if (q.type === 'boolean') {
                                            const radios = document.getElementsByName(q.id) as NodeListOf<HTMLInputElement>;
                                            radios.forEach((radio) => {
                                                if (radio.checked) {
                                                    answers[q.id] = radio.value === 'true';
                                                }
                                            });
                                        } else {
                                            const element = document.getElementById(q.id) as HTMLInputElement;
                                            if (element) {
                                                answers[q.id] = element.value;
                                            }
                                        }
                                    });
                                    handleClarificationResponse(answers);
                                }}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
                            >
                                Отправить
                            </button>
                            <button
                                onClick={() => {
                                    setClarificationMode(null);
                                    // Можно отправить вопрос без уточнений если это допустимо
                                }}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded"
                            >
                                Пропустить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}