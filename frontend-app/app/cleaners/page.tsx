"use client";
import React, { useState, useEffect } from 'react';

export default function CleanersPage() {
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Форма добавления клинера
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [district, setDistrict] = useState('');

  const fetchCleaners = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cleaners');
      if (res.ok) {
        setCleaners(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCleaners();
  }, []);

  const handleAddCleaner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      const res = await fetch('/api/cleaners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, telegramHandle, district }),
      });

      if (res.ok) {
        setName('');
        setPhone('');
        setTelegramHandle('');
        setDistrict('');
        fetchCleaners();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegeneratePin = async (id: number) => {
    try {
      const res = await fetch('/api/cleaners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'generate_pin' }),
      });
      if (res.ok) fetchCleaners();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500 text-xs">Загрузка команды...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">👥 Команда клинеров и привязка Telegram</h1>
        <p className="text-xs text-slate-500">Управление персоналом, авторизация в боте и контакты</p>
      </div>

      {/* Форма добавления клинера */}
      <form onSubmit={handleAddCleaner} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">➕ Добавить нового клинера</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Имя Фамилия"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
            required
          />
          <input
            type="text"
            placeholder="Номер телефона (+48...)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
          />
          <input
            type="text"
            placeholder="Telegram Handle (@username)"
            value={telegramHandle}
            onChange={(e) => setTelegramHandle(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
          />
          <input
            type="text"
            placeholder="Район проживания"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
          />
        </div>
        <button
          type="submit"
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-sm"
        >
          Добавить в систему
        </button>
      </form>

      {/* Список сотрудников */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">Список клинеров ({cleaners.length})</h2>
        </div>

        <div className="divide-y divide-slate-100">
          {cleaners.map((cleaner) => {
            const isLinked = Boolean(cleaner.telegramChatId);
            return (
              <div key={cleaner.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{cleaner.name}</span>
                    {isLinked ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-bold">
                        ✓ Telegram подключен
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-bold">
                        ⏳ Ожидает ввода PIN
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    📞 {cleaner.phone || 'Нет телефона'} • 📍 {cleaner.district || 'Район не указан'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {!isLinked && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block">PIN для бота:</span>
                      <span className="text-xs font-extrabold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200 tracking-wider">
                        {cleaner.authCode || '—'}
                      </span>
                    </div>
                  )}

                  {!isLinked && (
                    <button
                      onClick={() => handleRegeneratePin(cleaner.id)}
                      className="text-xs text-slate-500 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-100 transition"
                      title="Сгенерировать новый PIN"
                    >
                      🔄 PIN
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {cleaners.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">Сотрудники еще не добавлены.</div>
          )}
        </div>
      </div>
    </div>
  );
}
