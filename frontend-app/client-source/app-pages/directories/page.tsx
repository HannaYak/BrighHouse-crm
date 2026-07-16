import React, { useState } from 'react';

// Тестовые данные для отображения в справочниках
const initialCleaners = [
  { id: 1, name: 'Мария Сидорова', phone: '+48 555 111 222', address: 'Mokotów, Warszawa', tags: ['аллергия_на_кошек', 'только_поддерживающая'], status: 'active' },
  { id: 2, name: 'Анна Ковальчук', phone: '+48 555 333 444', address: 'Wola, Warszawa', tags: ['опыт_генералок', 'без_высоты'], status: 'active' }
];

const initialClients = [
  { id: 1, name: 'Алина Полякова', phone: '+48 123 456 789', address: 'ул. Коперника 14', blacklist: 'Светлана П.', favorite: 'Мария С.' }
];

export default function DirectoriesPage() {
  const [activeTab, setActiveTab] = useState<'cleaners' | 'clients' | 'services'>('cleaners');
  const [cleaners, setCleaners] = useState(initialCleaners);
  const [clients, setClients] = useState(initialClients);

  return (
    <div className="p-6 min-h-screen bg-slate-50 font-sans">
      {/* Шапка справочников */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">🗄️ Справочники и Настройки базы</h1>
        <p className="text-slate-500 text-sm">Управление персоналом, клиентами и услугами</p>
      </header>

      {/* Переключатель вкладок */}
      <div className="flex space-x-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('cleaners')}
          className={`py-2 px-4 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'cleaners' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          🙋‍♀️ Клинеры ({cleaners.length})
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`py-2 px-4 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'clients' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          👥 Клиенты ({clients.length})
        </button>
      </div>

      {/* Контент: Клинеры */}
      {activeTab === 'cleaners' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-700">База сотрудников</h3>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 px-4 rounded-lg shadow-sm transition">
              + Добавить клинера
            </button>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Имя</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Телефон</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Домашний адрес</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ограничения / Теги</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Статус</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200 text-sm text-slate-700">
              {cleaners.map((cleaner) => (
                <tr key={cleaner.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-slate-900">{cleaner.name}</td>
                  <td className="px-6 py-4 text-slate-500">{cleaner.phone}</td>
                  <td className="px-6 py-4">{cleaner.address}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {cleaner.tags.map((tag, idx) => (
                        <span key={idx} className="bg-amber-50 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-200">
                          ⚠️ {tag.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">Активен</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Контент: Клиенты */}
      {activeTab === 'clients' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-700">Клиентская база</h3>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 px-4 rounded-lg shadow-sm transition">
              + Новый клиент
            </button>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Имя</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Телефон</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Основной адрес</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Любимый клинер</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Чёрный список</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200 text-sm text-slate-700">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-slate-900">{client.name}</td>
                  <td className="px-6 py-4 text-slate-500">{client.phone}</td>
                  <td className="px-6 py-4">{client.address}</td>
                  <td className="px-6 py-4 text-emerald-600 font-semibold">💖 {client.favorite}</td>
                  <td className="px-6 py-4 text-red-600 font-semibold">🚫 {client.blacklist}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
