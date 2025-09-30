'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase-browser';
import { useRouter } from 'next/navigation';

const supabase = createClient();

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setMessage(`Ошибка: ${error.message}`);
                setLoading(false);
            } else {
                console.log('Вход успешен:', data);
                setTimeout(() => {
                    router.push('/');
                    router.refresh();
                }, 100);
            }
        } catch (error) {
            setMessage(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Вход в систему</h1>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Пароль</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition duration-200"
                    >
                        {loading ? 'Загрузка...' : 'Войти'}
                    </button>
                </form>
                {message && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}