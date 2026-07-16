import React, { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Временная заглушка для тестирования авторизации (логин: admin@clean.com, пароль: admin123)
    setTimeout(() => {
      if (email === 'admin@clean.com' && password === 'admin123') {
        // Сохраняем сессию (в будущем тут будет JWT-токен от бэкенда)
        localStorage.setItem('auth_token', 'mock-manager-jwt-token-2026');
        // Перенаправляем на Канбан
        window.location.href = '/kanban-board';
      } else {
        setError('Неверный E-mail или пароль. Попробуйте еще раз.');
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="text-5xl">🧹</span>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          CRM Bread House
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Вход в панель управления клинингом
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-slate-700">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm p-3 rounded-lg">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Рабочий E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder-slate-600"
                placeholder="manager@clean.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Пароль
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder-slate-600"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-50"
            >
              {isLoading ? 'Проверка...' : 'Войти в систему'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-700/50 pt-4 text-center">
            <span className="text-xs text-slate-500">
              Тестовые данные: admin@clean.com / admin123
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
