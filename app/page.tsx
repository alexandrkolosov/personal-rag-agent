'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '../lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { useDebounce } from '../hooks/useDebounce';
import { exportToMarkdown, exportToCSV, exportToDocx, downloadFile, exportComparisonToMarkdown } from '../lib/exportUtils';

// Components
import ToastNotification from './components/shared/ToastNotification';
import ProjectModal, { AI_ROLES } from './components/modals/ProjectModal';
import TopBar from './components/layout/TopBar';
import SearchSettingsPanel from './components/search/SearchSettingsPanel';
import DocumentPanel from './components/documents/DocumentPanel';
import ChatWindow from './components/chat/ChatWindow';
import ComparisonResults from './components/ComparisonResults';

const supabase = createClient();

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

    // НОВОЕ: стейты для сравнения документов
    const [comparisonMode, setComparisonMode] = useState(false);
    const [selectedDocsForComparison, setSelectedDocsForComparison] = useState<string[]>([]);
    const [showComparisonResults, setShowComparisonResults] = useState(false);
    const [comparisonResults, setComparisonResults] = useState<any>(null);
    const [comparing, setComparing] = useState(false);

    // НОВОЕ: стейты для управления кэшем
    const [clearingCache, setClearingCache] = useState(false);
    const [cacheStats, setCacheStats] = useState<any>(null);
    const [showCacheNotification, setShowCacheNotification] = useState(false);
    const [cacheNotificationMessage, setCacheNotificationMessage] = useState('');

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

    // Очистка кэша
    const handleClearCache = async () => {
        // Показываем подтверждение
        if (!confirm('Очистить память?\n\nЭто удалит кэшированные результаты поиска и следующие запросы будут получать свежие данные из Perplexity.')) {
            return;
        }

        setClearingCache(true);

        try {
            const response = await fetch('/api/cache/clear', {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                setCacheNotificationMessage('✅ Память очищена! Следующие поиски будут свежими.');
                setShowCacheNotification(true);

                // Скрыть уведомление через 3 секунды
                setTimeout(() => {
                    setShowCacheNotification(false);
                }, 3000);
            } else {
                setCacheNotificationMessage('❌ Ошибка при очистке кэша');
                setShowCacheNotification(true);
                setTimeout(() => {
                    setShowCacheNotification(false);
                }, 3000);
            }
        } catch (error) {
            console.error('Cache clear error:', error);
            setCacheNotificationMessage('❌ Не удалось очистить кэш');
            setShowCacheNotification(true);
            setTimeout(() => {
                setShowCacheNotification(false);
            }, 3000);
        } finally {
            setClearingCache(false);
        }
    };

    // Получение статистики кэша
    const fetchCacheStats = async () => {
        try {
            const response = await fetch('/api/cache/clear');
            if (response.ok) {
                const stats = await response.json();
                setCacheStats(stats);
            }
        } catch (error) {
            console.error('Failed to fetch cache stats:', error);
        }
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

    // НОВОЕ: обработка сравнения документов
    const handleCompareDocuments = useCallback(async (comparisonType: 'semantic' | 'ai_powered' = 'semantic') => {
        if (selectedDocsForComparison.length < 2) {
            alert('Выберите минимум 2 документа для сравнения');
            return;
        }

        setComparing(true);

        try {
            const response = await fetch('/api/compare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    documentIds: selectedDocsForComparison,
                    comparisonType,
                    projectId: activeProject?.id
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка сравнения');
            }

            setComparisonResults(data.comparison);
            setShowComparisonResults(true);
            console.log('Comparison completed:', data.comparison);

        } catch (error) {
            alert(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        } finally {
            setComparing(false);
        }
    }, [selectedDocsForComparison, session, activeProject]);

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

                // Add warning message if present (e.g., rate limit)
                if (data.warning) {
                    finalAnswer = `${data.warning}\n\n${finalAnswer}`;
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

                // Add warning message if present (e.g., rate limit)
                if (data.warning) {
                    finalAnswer = `${data.warning}\n\n${finalAnswer}`;
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
    const exportChat = useCallback(async (format: 'markdown' | 'csv' | 'docx') => {
        if (messages.length === 0) {
            alert('Нет сообщений для экспорта');
            return;
        }

        // Загружаем сообщения непосредственно из БД для гарантии актуальности
        try {
            let query = supabase
                .from('messages')
                .select('role, content, metadata, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            // Фильтруем по активному проекту
            if (activeProject) {
                query = query.eq('project_id', activeProject.id);
            } else {
                query = query.is('project_id', null);
            }

            const { data, error } = await query;

            if (error) {
                throw new Error('Ошибка загрузки сообщений: ' + error.message);
            }

            if (!data || data.length === 0) {
                alert('Нет сообщений для экспорта');
                return;
            }

            // Преобразуем в формат для экспорта
            const messagesToExport = data.map(msg => ({
                role: msg.role,
                content: msg.content,
                sources: msg.metadata?.sources || [],
                webSources: msg.metadata?.webSources || []
            }));

            const projectName = activeProject?.name || 'Без проекта';
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `chat_${projectName.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_${timestamp}`;

            if (format === 'markdown') {
                const markdown = exportToMarkdown(messagesToExport, projectName);
                downloadFile(markdown, `${filename}.md`, 'text/markdown');
            } else if (format === 'csv') {
                const csv = exportToCSV(messagesToExport, projectName);
                downloadFile(csv, `${filename}.csv`, 'text/csv');
            } else if (format === 'docx') {
                const docxBlob = await exportToDocx(messagesToExport, projectName);
                downloadFile(docxBlob, `${filename}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            }
        } catch (error) {
            console.error('Export error:', error);
            alert(`Ошибка экспорта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
    }, [messages, activeProject, user]);

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
        <main className="min-h-screen bg-warm-50 text-warm-800">
            {/* Toast Notification */}
            <ToastNotification
                show={showCacheNotification}
                message={cacheNotificationMessage}
            />

            {/* Верхняя панель с проектами */}
            <TopBar
                projects={projects}
                activeProject={activeProject}
                user={user}
                onProjectChange={(projectId) => {
                    const project = projects.find(p => p.id === projectId);
                    setActiveProject(project);
                }}
                onNewProject={() => setShowProjectModal(true)}
                onExport={exportChat}
                onLogout={handleLogout}
            />

            {/* НОВОЕ: Панель настроек поиска */}
            <SearchSettingsPanel
                webSearchEnabled={webSearchEnabled}
                comparisonMode={comparisonMode}
                forceWebSearch={forceWebSearch}
                showAdvancedSearch={showAdvancedSearch}
                searchMode={searchMode}
                domainFilter={domainFilter}
                clearingCache={clearingCache}
                onWebSearchChange={setWebSearchEnabled}
                onComparisonModeChange={(checked) => {
                    setComparisonMode(checked);
                    if (!checked) {
                        setSelectedDocsForComparison([]);
                    }
                }}
                onForceWebSearchChange={setForceWebSearch}
                onShowAdvancedSearchToggle={() => setShowAdvancedSearch(!showAdvancedSearch)}
                onSearchModeChange={setSearchMode}
                onDomainFilterChange={setDomainFilter}
                onClearCache={handleClearCache}
            />

            {/* Основной контент */}
            {activeProject ? (
                <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Левая панель - документы */}
                    <DocumentPanel
                        file={file}
                        uploading={uploading}
                        uploadStatus={uploadStatus}
                        autoSummary={autoSummary}
                        documents={projectDocuments}
                        loadingDocs={loadingDocs}
                        comparisonMode={comparisonMode}
                        selectedDocs={selectedDocsForComparison}
                        comparing={comparing}
                        onFileChange={handleFileChange}
                        onUpload={handleUpload}
                        onAutoSummaryChange={setAutoSummary}
                        onRefresh={loadDocuments}
                        onDocSelect={(docId, checked) => {
                            if (checked) {
                                if (selectedDocsForComparison.length >= 5) {
                                    alert('Максимум 5 документов для сравнения');
                                    return;
                                }
                                setSelectedDocsForComparison([...selectedDocsForComparison, docId]);
                            } else {
                                setSelectedDocsForComparison(selectedDocsForComparison.filter(id => id !== docId));
                            }
                        }}
                        onDocDelete={handleDeleteDocument}
                        onCompare={handleCompareDocuments}
                        formatFileSize={formatFileSize}
                        formatDate={formatDate}
                    />

                    {/* Центр - чат */}
                    <ChatWindow
                        projectName={activeProject.name}
                        projectRole={AI_ROLES[activeProject.role as keyof typeof AI_ROLES]?.split(' - ')[0] || activeProject.role}
                        documentCount={projectDocuments.length}
                        messages={messages}
                        suggestedQuestions={suggestedQuestions}
                        question={question}
                        asking={asking}
                        webSearchEnabled={webSearchEnabled}
                        onQuestionChange={setQuestion}
                        onSubmit={handleAsk}
                        onExport={exportChat}
                        onClearChat={clearChat}
                        onSuggestedQuestionClick={setQuestion}
                    />
                </div>
            ) : (
                <div className="flex items-center justify-center h-[calc(100vh-120px)]">
                    <div className="text-center">
                        <h2 className="text-2xl mb-4">👋 Добро пожаловать!</h2>
                        <p className="text-gray-400 mb-6">Создайте первый проект для работы с документами</p>
                        <button
                            onClick={() => setShowProjectModal(true)}
                            className="bg-accent-500 hover:bg-accent-600 text-white px-6 py-2 rounded-lg text-sm font-normal transition-colors"
                        >
                            ➕ Создать проект
                        </button>
                    </div>
                </div>
            )}

            {/* Модалка создания проекта */}
            <ProjectModal
                show={showProjectModal}
                projectName={newProjectName}
                selectedRole={selectedRole}
                customRole={customRole}
                onProjectNameChange={setNewProjectName}
                onRoleChange={setSelectedRole}
                onCustomRoleChange={setCustomRole}
                onCreate={createProject}
                onClose={() => {
                    setShowProjectModal(false);
                    setNewProjectName('');
                    setSelectedRole('analyst');
                    setCustomRole('');
                }}
            />

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

            {/* Comparison Results Modal */}
            {showComparisonResults && comparisonResults && (
                <ComparisonResults
                    comparison={comparisonResults}
                    onClose={() => {
                        setShowComparisonResults(false);
                        setComparisonResults(null);
                        setSelectedDocsForComparison([]);
                        setComparisonMode(false);
                    }}
                />
            )}
        </main>
    );
}