"use client";
import React, { useState } from 'react';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

type Status = 'new' | 'processing' | 'selecting' | 'assigned' | 'completed' | 'cancelled';

interface Order extends OrderDetail {
  urgency: 'urgent' | 'today' | 'confirmed' | 'normal';
  status: Status;
}

const initialOrders: Order[] = [
  {
    id: 'ORD-101',
    time: '10:00 — 14:00',
    date: '17.07.2026',
    clientName: 'Алина Полякова',
    clientPhone: '+48 123 456 789',
    addressLine1: 'ул. Коперника 14',
    addressLine2: 'кв. 12, подъезд 2',
    price: 250,
    cleanersCount: 1,
    assignedCleaners: ['Мария Сидорова'],
    tags: { vacuum: true, pets: true, keys: true },
    urgency: 'today',
    status: 'new',
    serviceType: 'Генеральная',
    clientNotes: 'Помыть внутри духовки и протереть люстру в гостиной.',
  },
  {
    id: 'ORD-102',
    time: '12:00 — 18:00',
    date: '17.07.2026',
    clientName: 'Ян Ковальский',
    clientPhone: '+48 987 654 321',
    addressLine1: 'al. Jerozolimskie 85',
    addressLine2: 'офис 402',
    price: 450,
    cleanersCount: 2,
    assignedCleaners: ['Анна Ковальчук'],
    tags: { vacuum: true, pets: false, keys: false },
    urgency: 'confirmed',
    status: 'selecting',
    serviceType: 'Поддерживающая',
    clientNotes: 'Ключи у консьержа, оплата по безналу.',
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleSaveOrder = (updated: OrderDetail) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Канбан-доска заказов</h1>
          <p className="text-xs text-slate-500 mt-0.5">Кликните на карточку для открытия ТЗ и назначения клинеров</p>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 items-start">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.key);
          return (
            <div
              key={col.key}
              className="w-80 flex-shrink-0 bg-slate-100/70 border border-slate-200/80 rounded-xl p-3 flex flex-col max-h-full"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-semibold text-xs text-slate-700 uppercase tracking-wide">
                  {col.title}
                </span>
                <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                  {colOrders.length}
                </span>
              </div>

              <div className="flex flex-col gap-2.5 overflow-y-auto pr-0.5">
                {colOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => openOrder(order)}
                    className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:border-brand-500 hover:shadow-md transition cursor-pointer flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        ⏱️ {order.time}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{order.id}</span>
                    </div>

                    <div className="font-semibold text-sm text-slate-900 leading-tight">
                      {order.clientName}
                    </div>

                    <div className="text-xs text-slate-500 leading-snug">
                      <div>📍 {order.addressLine1}</div>
                      <div className="text-slate-400 pl-4">{order.addressLine2}</div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-0.5">
                      <span className="text-sm font-bold text-slate-800">{order.price} zł</span>
                      <span className="text-xs text-brand-600 font-semibold">
                        {order.assignedCleaners.length > 0
                          ? `🙋‍♀️ ${order.assignedCleaners[0]}`
                          : 'Без клинера'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <OrderModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveOrder}
      />
    </div>
  );
}
