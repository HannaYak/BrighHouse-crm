"use client";
import React, { useState, useEffect } from 'react';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

type Status = 'NEW' | 'PROCESSING' | 'SELECTING' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';

interface Order extends OrderDetail {
  urgency: 'urgent' | 'today' | 'confirmed' | 'normal';
  status: Status;
}

const columns: { key: Status; title: string }[] = [
  { key: 'NEW', title: 'Новая заявка' },
  { key: 'PROCESSING', title: 'В обработке' },
  { key: 'SELECTING', title: 'Подбор клинера' },
  { key: 'ASSIGNED', title: 'Назначен' },
  { key: 'COMPLETED', title: 'Выполнен' },
  { key: 'CANCELLED', title: 'Отмена' },
];

export default function KanbanPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        const formatted: Order[] = data.map((item: any) => ({
          id: item.id,
          orderNumber: item.orderNumber,
          timeSlot: item.timeSlot || '10:00 — 14:00',
          date: new Date(item.date).toISOString().split('T')[0],
          serviceType: item.serviceType || 'STANDARD',
          areaM2: item.areaM2 || 45,
          roomsCount: item.roomsCount || 1,
          bathroomsCount: item.bathroomsCount || 1,
          windowsCount: item.windowsCount || 0,
          hasOven: item.hasOven || false,
          hasFridge: item.hasFridge || false,
          hasMicrowave: item.hasMicrowave || false,
          hasBalcony: item.hasBalcony || false,
          hasDishes: item.hasDishes || false,
          hasIroning: item.hasIroning || false,
          hasVacuum: item.hasVacuum || false,
          hasPets: item.hasPets || false,
          hasKeys: item.hasKeys || false,
          clientName: item.clientName,
          clientPhone: item.clientPhone,
          addressLine1: item.addressLine1,
          addressLine2: item.addressLine2 || '',
          price: item.price,
          cleanersCount: item.cleanersCount || 1,
          assignedCleaners: item.assignedCleaners?.map((ac: any) => ({
            id: ac.cleaner.id,
            name: ac.cleaner.name,
            phone: ac.cleaner.phone,
          })) || [],
          urgency: (item.urgency || 'NORMAL').toLowerCase(),
          status: item.status || 'NEW',
          notes: item.notes || '',
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

  const handleDragStart = (id: string) => {
    setDraggedOrderId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (newStatus: Status) => {
    if (!draggedOrderId) return;

    // Оптимистичное обновление UI
    setOrders((prev) =>
      prev.map((o) => (o.id === draggedOrderId ? { ...o, status: newStatus } : o))
    );

    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draggedOrderId, status: newStatus }),
      });
    } catch (e) {
      console.error('Ошибка обновления статуса:', e);
      fetchOrders();
    } finally {
      setDraggedOrderId(null);
    }
  };

  const openCreateModal = () => {
    setSelectedOrder(null);
    setIsModalOpen(true);
  };

  const openEditModal = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleSaveOrder = async (saved: OrderDetail) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saved),
      });

      if (res.ok) {
        fetchOrders();
      }
    } catch (e) {
      console.error('Ошибка сохранения заказа:', e);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Канбан-доска заказов</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {loading ? 'Синхронизация с базой...' : `Всего заказов: ${orders.length} (Перетаскивай карточки между колонками)`}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition"
        >
          + Создать заказ
        </button>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 items-start">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.key);
          return (
            <div
              key={col.key}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.key)}
              className="w-80 flex-shrink-0 bg-slate-100/70 border border-slate-200/80 rounded-xl p-3 flex flex-col max-h-full min-h-[400px] transition-colors"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-semibold text-xs text-slate-700 uppercase tracking-wide">
                  {col.title}
                </span>
                <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                  {colOrders.length}
                </span>
              </div>

              <div className="flex flex-col gap-2.5 overflow-y-auto pr-0.5 flex-1">
                {colOrders.map((order) => (
                  <div
                    key={order.id || order.orderNumber}
                    draggable
                    onDragStart={() => handleDragStart(order.id!)}
                    onClick={() => openEditModal(order)}
                    className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:border-brand-500 hover:shadow-md active:cursor-grabbing transition cursor-grab flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        ⏱️ {order.timeSlot}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{order.orderNumber}</span>
                    </div>

                    <div className="font-semibold text-sm text-slate-900 leading-tight">
                      {order.clientName}
                    </div>

                    <div className="text-xs text-slate-500 leading-snug">
                      <div>📍 {order.addressLine1}</div>
                      {order.addressLine2 && <div className="text-slate-400 pl-4">{order.addressLine2}</div>}
                    </div>

                    <div className="flex flex-wrap gap-1 mt-0.5">
                      <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded font-medium">
                        {order.areaM2} м²
                      </span>
                      {order.hasPets && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded">
                          🐾 Животные
                        </span>
                      )}
                      {order.hasVacuum && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded">
                          🔌 Пылесос
                        </span>
                      )}
                      {order.hasKeys && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded">
                          🔑 Ключи
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-0.5">
                      <span className="text-sm font-bold text-slate-800">{order.price} zł</span>
                      <span className="text-xs text-brand-600 font-semibold truncate max-w-[140px] text-right">
                        {order.assignedCleaners && order.assignedCleaners.length > 0
                          ? `👥 ${order.assignedCleaners.map((c) => c.name).join(', ')}`
                          : 'Клинер не выбран'}
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
