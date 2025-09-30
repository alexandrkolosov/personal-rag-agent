'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase-browser';
import { useRouter } from 'next/navigation';

const supabase = createClient();

interface Document {
    id: string;
    filename: string;
    file_size: number;
    created_at: string;
}

export default function Home() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
    const [asking, setAsking] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);

    const router = useRouter();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            if (!session) {
                router.push('/login');
            } else {
                loadDocuments();
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (!session) {
                router.push('/login');
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    const loadDocuments = async () => {
        setLoadingDocs(true);
        try {
            const { data, error } = await supabase
                .from('documents')
                .select('id, filename, file_size, created_at')
                .order('created_at', { ascending: false });

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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setUploadStatus('');
        }
    };

    const handleUpload = async () => {
        if (!file || !session) {
            setUploadStatus('Ошибка: нет файла или сессии');
            return;
        }

        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        if (!allowedTypes.includes(file.type)) {
            setUploadStatus('Поддерживаются только PDF, DOCX и TXT файлы');
            return;
        }

        setUploading(true);
        setUploadStatus('Загрузка...');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/ingest', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setUploadStatus(`Успешно загружено: ${data.filename}`);
                setFile(null);
                const fileInput = document.getElementById('fileInput') as HTMLInputElement;
                if (fileInput) fileInput.value = '';

                // Перезагрузить список документов
                await loadDocuments();
            } else {
                setUploadStatus(`Ошибка: ${data.error}`);
            }
        } catch (error) {
            setUploadStatus(`Ошибка загрузки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!confirm('Удалить этот документ?')) return;

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
                body: JSON.stringify({ question: userMessage }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: `Ошибка: ${data.error}` }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
            }]);
        } finally {
            setAsking(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

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
        <main className="min-h-screen p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Личный RAG Агент</h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{user.email}</span>
                    <button
                        onClick={handleLogout}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
                    >
                        Выйти
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Upload & Documents */}
                <div className="space-y-6">
                    {/* Document Upload Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4">Загрузка документов</h2>
                        <div className="space-y-4">
                            <div>
                                <input
                                    id="fileInput"
                                    type="file"
                                    accept=".pdf,.docx,.txt"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none p-2"
                                />
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Поддерживаются: PDF, DOCX, TXT
                                </p>
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                            >
                                {uploading ? 'Загрузка...' : 'Загрузить'}
                            </button>

                            {uploadStatus && (
                                <div className={`p-3 rounded-lg ${uploadStatus.includes('Ошибка') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {uploadStatus}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Documents List */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Мои документы</h2>
                            <button
                                onClick={loadDocuments}
                                disabled={loadingDocs}
                                className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                            >
                                {loadingDocs ? 'Загрузка...' : 'Обновить'}
                            </button>
                        </div>

                        {documents.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                Документы еще не загружены
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {doc.filename}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteDocument(doc.id)}
                                            className="ml-2 text-red-600 hover:text-red-700 text-sm"
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Chat */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">Чат с документами</h2>

                    {/* Messages */}
                    <div className="space-y-4 mb-4 h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        {messages.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500 mb-4">Загрузите документы и начните задавать вопросы</p>
                                <div className="text-sm text-gray-400 space-y-2">
                                    <p>📄 У вас загружено документов: <strong>{documents.length}</strong></p>
                                    {documents.length > 0 && (
                                        <p className="text-yellow-600">
                                            ⚠️ Функция RAG (поиск по документам) будет реализована на следующем этапе
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-lg ${
                                        msg.role === 'user'
                                            ? 'bg-blue-100 dark:bg-blue-900 ml-auto max-w-[80%]'
                                            : 'bg-gray-100 dark:bg-gray-700 mr-auto max-w-[80%]'
                                    }`}
                                >
                                    <p className="text-sm font-semibold mb-1">
                                        {msg.role === 'user' ? 'Вы' : 'Ассистент'}
                                    </p>
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !asking && handleAsk()}
                            placeholder="Задайте вопрос о документах..."
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={asking}
                        />
                        <button
                            onClick={handleAsk}
                            disabled={!question.trim() || asking}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                        >
                            {asking ? 'Думаю...' : 'Отправить'}
                        </button>
                    </div>

                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>Статус:</strong> Базовая версия работает! ✅
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            • Загрузка документов работает<br/>
                            • Следующий этап (Prompt B): RAG поиск и ответы по документам
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}