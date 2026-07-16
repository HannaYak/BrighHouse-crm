import React from 'react';

// Тестовые данные для демонстрации интерфейса
const mockOrders = [
  {
    id: '1',
    clientName: 'Алина Полякова',
    address: 'ул. Коперника 14, кв. 12',
    date: '17.07.2026',
    time: '10:00 - 14:00',
    price: '250 zł',
    needsVacuum: true,
    hasPets: true,
    keysAction: 'забрать на ресепшене',
    status: 'new_lead'
  },
  {
    id: '2',
    clientName: 'Ян Ковальский',
    address: 'al. Jerozolimskie 85',
    date: '17.07.2026',
    time: '12:00 - 18:00',
    price: '400 zł',
    needsVacuum: false,
    hasPets: false,
    keysAction: null,
    status: 'finding_cleaner'
  }
];

const columns = [
  { id: 'new_lead', title: 'Новая заявка', color: 'bg-blue-50' },
  { id: 'in_progress', title: 'В обработке', color: 'bg-yellow-50' },
  { id: 'finding_cleaner', title: 'Подбор клинера', color: 'bg-orange-50' },
  { id: 'assigned', title: 'Назначен', color: 'bg-green-50' },
  { id: 'completed', title: 'Выполнен / Закрыт', color: 'bg-gray-100' }
];

export default function KanbanBoard() {
  return (
    <div className="p-6 min-h-screen bg-slate-50 font-sans">
      {/* Шапка CRM */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🧹 CRM Клининг — Панель Менеджера</h1>
          <p className="text-slate-500 text-sm">Спринт 1: Рабочее пространство</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-sm transition">
          + Создать заказ
        </button>
      </header>

      {/* Сетка Канбан-доски */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {columns.map((column) => (
          <div key={column.id} className={`rounded-xl p-4 border border-slate-200 ${column.color}`}>
            <h3 className="font-semibold text-slate-700 mb-4 flex justify-between items-center">
              <span>{column.title}</span>
              <span className="text-xs bg-white text-slate-500 px-2.5 py-1 rounded-full border border-slate-200 shadow-sm">
                {mockOrders.filter(o => o.status === column.id).length}
              </span>
            </h3>

            {/* Карточки внутри колонки */}
            <div className="space-y-3">
              {mockOrders
                .filter((order) => order.status === column.id)
                .map((order) => (
                  <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-indigo-600">{order.price}</span>
                      <span className="text-xs text-slate-400">{order.date} ({order.time})</span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">{order.clientName}</h4>
                    <p className="text-xs text-slate-500 mb-3 truncate">{order.address}</p>

                    {/* Критические теги (Чекбоксы на лицевой стороне) */}
                    <div className="flex flex-wrap gap-1.5">
                      {order.needsVacuum && (
                        <span className="inline-flex items-center text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                          🔌 Пылесос
                        </span>
                      )}
                      {order.hasPets && (
                        <span className="inline-flex items-center text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">
                          🐾 Животные
                        </span>
                      )}
                      {order.keysAction && (
                        <span className="inline-flex items-center text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded" title={order.keysAction}>
                          🔑 Ключи
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
