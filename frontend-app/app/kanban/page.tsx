"use client";
import React, { useState, useEffect } from 'react';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

type Status = 'new' | 'processing' | 'selecting' | 'assigned' | 'completed' | 'cancelled';

interface Order extends OrderDetail {
  urgency: 'urgent' | 'today' | 'confirmed' | 'normal';
  status: Status;
}

const columns: { key: Status; title: string }[] = [
  { key: 'new', title: 'Новая заявка' },
  { key: 'processing', title: 'В обработке' },
  { key: 'selecting', title: 'Подбор клинера' },
  { key: 'assigned', title: 'Назначен' },
  { key: 'completed', title: 'Выполнен / Закрыт' },
  { key: 'cancelled', title: 'Отмена' },
];

export default function KanbanPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Загрузка заказов из базы данных
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        const formatted: Order[] = data.map((item: any) => ({
          id: item.orderNumber || item.id,
          time: item.timeSlot || '10:00 — 14:00',
          date: new Date(item.date).toLocaleDateString('ru-RU'),
          clientName: item.clientName,
          clientPhone: item.clientPhone,
          addressLine1: item.addressLine1,
          addressLine2: item.addressLine2 || '',
          price: item.price,
          cleanersCount: item.cleanersCount,
          assignedCleaners: item.assignedCleaners?.map((ac: any) => ac.cleaner.name) || [],
          tags: { vacuum: item.hasVacuum, pets: item.hasPets, keys: item.hasKeys },
          urgency: item.urgency.toLowerCase(),
          status: item.status.toLowerCase(),
          serviceType: 'Стандартная',
          clientNotes: item.notes || '',
        }));
        setOrders(formatted);
      }
    } catch (e) {
      console.error('Ошибка загрузки заказов:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Быстрое создание тестового заказа в базе
  const handleCreateTestOrder = async () => {
    const newOrderPayload = {
      date: new Date().toISOString(),
      time: '11:00 — 15:00',
      clientName: 'Новый Клиент',
      clientPhone: '+48 500 600 700',
      addressLine1: 'ul. Prosta 20',
      addressLine2: 'кв. 15',
      price: 320,
      cleanersCount: 1,
      tags: { vacuum: true, pets: false, keys: true },
      urgency: 'TODAY',
      status: 'NEW',
      clientNotes: 'Помыть балкон и окна.',
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrderPayload),
      });

      if (res.ok) {
        fetchOrders();
      }
    } catch (e) {
      console.error('Ошибка создания заказа:', e);
    }
  };

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
          <p className="text-xs text-slate-500 mt-0.5">
            {loading ? 'Синхронизация с базой...' : `Всего заказов: ${orders.length}`}
          </p>
        </div>
        <button
          onClick={handleCreateTestOrder}
          className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition"
        >
          + Создать тестовый заказ
        </button>
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
