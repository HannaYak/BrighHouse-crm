"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/kanban'); // Перенаправляем на Канбан при успехе
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Неверный пароль');
      }
    } catch (e) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-lg">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-brand-100 text-brand-700 font-extrabold rounded-2xl mx-auto flex items-center justify-center text-xl mb-3 shadow-xs">
            🧹
          </div>
          <h1 className="text-xl font-bold text-slate-900">BrightHouse CRM</h1>
          <p className="text-xs text-slate-500 mt-1">Введите пароль для доступа к системе управления</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Пароль администратора</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-500 shadow-inner"
              required
            />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold p-2.5 rounded-xl text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition shadow-sm"
          >
            {loading ? 'Проверка...' : 'Войти в систему 🔓'}
          </button>
        </form>
      </div>
    </div>
  );
}
