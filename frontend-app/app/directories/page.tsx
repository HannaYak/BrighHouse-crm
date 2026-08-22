"use client";
import React, { useState, useEffect } from 'react';

interface CleanerItem {
  id: number;
  name: string;
  phone: string;
  district: string;
  telegramChatId?: string | null;
  authCode?: string | null;
  tags: string[];
  status: string;
}

interface ClientItem {
  id: number;
  name: string;
  phone: string;
  address: string;
  favoriteCleaner?: string | null;
  blacklistCleaner?: string | null;
}

export default function DirectoriesPage() {
  const [activeTab, setActiveTab] = useState<'cleaners' | 'clients'>('cleaners');
  const [cleaners, setCleaners] = useState<CleanerItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Формы создания
  const [newCleanerName, setNewCleanerName] = useState('');
  const [newCleanerPhone, setNewCleanerPhone] = useState('');
  const [newCleanerDistrict, setNewCleanerDistrict] = useState('');

  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [cleanersRes, clientsRes] = await Promise.all([
        fetch('/api/cleaners'),
        fetch('/api/clients'),
      ]);
      if (cleanersRes.ok) setCleaners(await cleanersRes.json());
      if (clientsRes.ok) setClients(await clientsRes.json());
    } catch (e) {
      console.error('Ошибка загрузки данных:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Генерация PIN-кода для связки с Telegram
  const handleGeneratePin = async (cleanerId: number) => {
    try {
      const res = await fetch('/api/cleaners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_pin', cleanerId }),
      });
      if (res.ok) {
        const data = await res.json();
        setCleaners((prev) =>
          prev.map((c) => (c.id === cleanerId ? { ...c, authCode: data.authCode } : c))
        );
      }
    } catch (e) {
      console.error('Ошибка генерации PIN:', e);
    }
  };

  // Добавление клинера
  const handleAddCleaner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCleanerName || !newCleanerPhone) return;

    try {
      const res = await fetch('/api/cleaners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCleanerName,
          phone: newCleanerPhone,
          district: newCleanerDistrict || 'Центр',
          tags: ['стандарт', 'генеральная'],
        }),
      });
      if (res.ok) {
        setNewCleanerName('');
        setNewCleanerPhone('');
        setNewCleanerDistrict('');
        loadData();
      }
    } catch (e) {
      console.error('Ошибка добавления клинера:', e);
    }
  };

  // Добавление клиента
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientPhone) return;

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName,
          phone: newClientPhone,
          address: newClientAddress,
        }),
      });
      if (res.ok) {
        setNewClientName('');
        setNewClientPhone('');
        setNewClientAddress('');
        loadData();
      }
    } catch (e) {
      console.error('Ошибка добавления клиента:', e);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">🗄️ Справочники и Персонал</h1>
        <p className="text-xs text-slate-500 mt-0.5">Управление клинерами, генерация кодов для Telegram и база клиентов</p>
      </div>

      <div className="flex space-x-3 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('cleaners')}
          className={`pb-3 px-2 text-xs font-bold border-b-2 transition ${
            activeTab === 'cleaners'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          🙋‍♀️ Клинеры ({cleaners.length})
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`pb-3 px-2 text-xs font-bold border-b-2 transition ${
            activeTab === 'clients'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          👥 Клиенты ({clients.length})
        </button>
      </div>

      {activeTab === 'cleaners' && (
        <div className="space-y-6">
          {/* Форма быстрого добавления клинера */}
          <form onSubmit={handleAddCleaner} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ФИО Клинера</label>
              <input
                type="text"
                placeholder="Анна Ковальчук"
                value={newCleanerName}
                onChange={(e) => setNewCleanerName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
              />
            </div>
            <div className="w-48">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Телефон</label>
              <input
                type="text"
                placeholder="+48 000 000 000"
                value={newCleanerPhone}
                onChange={(e) => setNewCleanerPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
              />
            </div>
            <div className="w-48">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Район проживания</label>
              <input
                type="text"
                placeholder="Mokotów / Центр"
                value={newCleanerDistrict}
                onChange={(e) => setNewCleanerDistrict(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
              />
            </div>
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition"
            >
              + Добавить
            </button>
          </form>

          {/* Список клинеров */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Клинер</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Телефон</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Район</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Telegram-бот</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase text-right">PIN-код</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {cleaners.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-bold text-slate-800">🙋‍♀️ {c.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{c.phone}</td>
                    <td className="px-4 py-3 text-slate-600">📍 {c.district}</td>
                    <td className="px-4 py-3">
                      {c.telegramChatId ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">
                          ✅ Подключен
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[11px]">
                          Не привязан
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.authCode ? (
                        <span className="font-mono bg-amber-50 text-amber-800 border border-amber-300 font-bold px-2 py-1 rounded text-xs">
                          {c.authCode}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleGeneratePin(c.id)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded text-[11px] transition"
                        >
                          Сгенерировать PIN
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="space-y-6">
          <form onSubmit={handleAddClient} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ФИО Клиента</label>
              <input
                type="text"
                placeholder="Иван Петров"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
              />
            </div>
            <div className="w-48">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Телефон</label>
              <input
                type="text"
                placeholder="+48 000 000 000"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Адрес</label>
              <input
                type="text"
                placeholder="ul. Marszałkowska 10, кв. 5"
                value={newClientAddress}
                onChange={(e) => setNewClientAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
              />
            </div>
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition"
            >
              + Добавить
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Имя</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Телефон</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Адрес</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-bold text-slate-800">👤 {client.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{client.phone}</td>
                    <td className="px-4 py-3 text-slate-600">📍 {client.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
