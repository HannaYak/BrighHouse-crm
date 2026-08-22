"use client";
import React, { useState } from 'react';

type Status = 'new' | 'processing' | 'selecting' | 'assigned' | 'completed' | 'cancelled';

interface Order {
  id: string;
  time: string;
  clientName: string;
  addressLine1: string;
  addressLine2: string;
  price: number;
  cleanersCount: number;
  cleanerNames: string[];
  tags: { vacuum?: boolean; pets?: boolean; keys?: boolean };
  urgency: 'urgent' | 'today' | 'confirmed' | 'normal';
  status: Status;
}

const initialOrders: Order[] = [
  {
    id: 'ORD-101',
    time: '10:00 — 14:00',
    clientName: 'Алина Полякова',
    addressLine1: 'ул. Коперника 14',
    addressLine2: 'кв. 12, подъезд 2',
    price: 250,
    cleanersCount: 1,
    cleanerNames: ['Мария С.'],
    tags: { vacuum: true, pets: true, keys: true },
    urgency: 'today',
    status: 'new',
  },
  {
    id: 'ORD-102',
    time: '12:00 — 18:00',
    clientName: 'Ян Ковальский',
    addressLine1: 'al. Jerozolimskie 85',
    addressLine2: 'офис 402',
    price: 450,
    cleanersCount: 2,
    cleanerNames: ['Анна К.', 'Елена Д.'],
    tags: { vacuum: true, pets: false, keys: false },
    urgency: 'confirmed',
    status: 'selecting',
  },
  {
    id: 'ORD-103',
    time: '09:00 — 12:30',
    clientName: 'Ольга Новак',
    addressLine1: 'ul. Marszałkowska 10',
    addressLine2: 'кв. 5',
    price: 200,
    cleanersCount: 1,
    cleanerNames: [],
    tags: { vacuum: false, pets: true, keys: false },
    urgency: 'urgent',
    status: 'processing',
  },
];

const columns: { key: Status; title: string }[] = [
  { key: 'new', title: 'Новая заявка' },
  { key: 'processing', title: 'В обработке' },
  { key: 'selecting', title: 'Подбор клинера' },
  { key: 'assigned', title: 'Назначен' },
  { key: 'completed', title: 'Выполнен / Закрыт' },
  { key: 'cancelled', title: 'Отмена' },
];

export default function KanbanPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);

  const getUrgencyBadge = (urgency: Order['urgency']) => {
    switch (urgency) {
      case 'urgent':
        return <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-100" title="Срочно / Просрочен" />;
      case 'today':
        return <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-amber-100" title="Сегодня" />;
      case 'confirmed':
        return <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" title="Подтвержден" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)]">
      {/* Верхняя панель действий */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Канбан-доска заказов</h1>
          <p className="text-xs text-slate-500 mt-0.5">Оперативное распределение и контроль статусов</p>
        </div>
        <button className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition">
          + Создать заказ
        </button>
      </div>

      {/* Колонки воронки */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 items-start">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.key);
          return (
            <div
              key={col.key}
              className="w-80 flex-shrink-0 bg-slate-100/70 border border-slate-200/80 rounded-xl p-3 flex flex-col max-h-full"
            >
              {/* Заголовок колонки */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-semibold text-xs text-slate-700 uppercase tracking-wide">
                  {col.title}
                </span>
                <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                  {colOrders.length}
                </span>
              </div>

              {/* Список карточек */}
              <div className="flex flex-col gap-2.5 overflow-y-auto pr-0.5">
                {colOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-2"
                  >
                    {/* Время, ID и Индикатор срочности */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        ⏱️ {order.time}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-slate-400">{order.id}</span>
                        {getUrgencyBadge(order.urgency)}
                      </div>
                    </div>

                    {/* Имя клиента */}
                    <div className="font-semibold text-sm text-slate-900 leading-tight">
                      {order.clientName}
                    </div>

                    {/* Адрес в две строки */}
                    <div className="text-xs text-slate-500 leading-snug">
                      <div>📍 {order.addressLine1}</div>
                      <div className="text-slate-400 pl-4">{order.addressLine2}</div>
                    </div>

                    {/* Метки (животные, пылесос, ключи) */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {order.tags.vacuum && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded">
                          🔌 Пылесос
                        </span>
                      )}
                      {order.tags.pets && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded">
                          🐾 Животные
                        </span>
                      )}
                      {order.tags.keys && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded">
                          🔑 Ключи
                        </span>
                      )}
                    </div>

                    {/* Подвал карточки: Цена и Клинеры */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-0.5">
                      <span className="text-sm font-bold text-slate-800">
                        {order.price} zł
                      </span>

                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1.5">
                          {order.cleanerNames.length > 0 ? (
                            order.cleanerNames.map((name, i) => (
                              <div
                                key={i}
                                title={name}
                                className="w-6 h-6 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white"
                              >
                                {name[0]}
                              </div>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Клинер не выбран</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
