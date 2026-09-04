"use client";
import React, { useState, useEffect } from 'react';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // с 8:00 до 20:00
const ROW_HEIGHT = 64; // высота одной часовой строки в пикселях

export default function SchedulePage() {
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Стейт для модалки редактирования заказа при клике на карточку
  const [editingOrder, setEditingOrder] = useState<OrderDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cleanersRes, ordersRes] = await Promise.all([
        fetch('/api/cleaners'),
        fetch('/api/orders')
      ]);
      
      if (cleanersRes.ok) setCleaners(await cleanersRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Фильтрация заказов на выбранный день
  const dayOrders = orders.filter((o: any) => {
    if (!o.date) return false;
    const orderDateStr = new Date(o.date).toISOString().slice(0, 10);
    return orderDateStr === selectedDate && o.status !== 'CANCELLED';
  });

  const gridStyle = {
    gridTemplateColumns: `80px repeat(${Math.max(cleaners.length, 1)}, minmax(180px, 1fr))`,
  };

  const handleSaveOrder = async (saved: OrderDetail) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saved),
      });
      if (res.ok) {
        loadData();
        setIsModalOpen(false);
      } else {
        alert('Ошибка сохранения заказа');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-10 text-center text-xs text-slate-500">Загрузка расписания...</div>;

  return (
    <div className="space-y-6 max-w-full mx-auto pb-12 px-4">
      {/* Шапка с выбором даты */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📅 Календарь-таймлайн смен</h1>
          <p className="text-xs text-slate-500">Интерактивная сетка заказов. Кликните на карточку для редактирования.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().slice(0, 10));
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition"
          >
            ← Предыдущий день
          </button>
          
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
          />

          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().slice(0, 10));
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition"
          >
            Следующий день →
          </button>
        </div>
      </div>

      {/* Таймлайн сетка */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        <div className="min-w-[900px] relative">
          {/* Шапка с именами клинеров */}
          <div className="grid border-b border-slate-200 bg-slate-50 sticky top-0 z-20" style={gridStyle}>
            <div className="p-3 text-center text-xs font-bold text-slate-400 border-r border-slate-200 flex items-center justify-center">
              Время
            </div>
            {cleaners.map((cleaner) => (
              <div key={cleaner.id} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                <div className="font-bold text-xs text-slate-900 truncate">{cleaner.name}</div>
                <span className="text-[10px] text-slate-400 block truncate">📍 {cleaner.district || 'Центр'}</span>
              </div>
            ))}
          </div>

          {/* Строки часов и колонки */}
          <div className="relative">
            {/* Фоновая сетка часов */}
            <div className="divide-y divide-slate-100">
              {HOURS.map((hour) => {
                const hourStr = `${hour < 10 ? '0' + hour : hour}:00`;
                return (
                  <div key={hour} className="grid" style={{ ...gridStyle, height: `${ROW_HEIGHT}px` }}>
                    <div className="p-2 text-center text-xs font-mono font-bold text-slate-400 border-r border-slate-100 bg-slate-50/50 flex items-center justify-center">
                      {hourStr}
                    </div>
                    {cleaners.map((cleaner) => (
                      <div key={cleaner.id} className="border-r border-slate-100 last:border-r-0 bg-white hover:bg-slate-50/30 transition"></div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Карточки заказов с правильной высотой (абсолютное позиционирование) */}
            <div className="absolute inset-0 grid pointer-events-none z-10" style={gridStyle}>
              {/* Пустая колонка под время */}
              <div></div>

              {/* Колонки клинеров с их заказами */}
              {cleaners.map((cleaner) => {
                const cleanerOrders = dayOrders.filter((o) =>
                  o.assignedCleaners?.some((ac: any) => ac.cleanerId === cleaner.id)
                );

                return (
                  <div key={cleaner.id} className="relative border-r border-transparent last:border-r-0 pointer-events-auto">
                    {cleanerOrders.map((order) => {
                      const slot = order.timeSlot || order.startTime || '10:00 — 14:00';
                      // Парсим время начала и конца (например, "10:00 — 14:00" или "10:00")
                      const parts = slot.split('—').map((s: string) => s.trim());
                      const startTime = parts[0] || '10:00';
                      const endTime = parts[1] || '14:00';

                      const [startH, startM] = startTime.split(':').map(Number);
                      const [endH, endM] = endTime.split(':').map(Number);

                      const startMinutes = (startH - 8) * 60 + (startM || 0);
                      const durationMinutes = Math.max(60, (endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0)));

                      const topPx = (startMinutes / 60) * ROW_HEIGHT;
                      const heightPx = (durationMinutes / 60) * ROW_HEIGHT - 4; // минус отступы

                      return (
                        <div
                          key={order.id}
                          onClick={() => {
                            setEditingOrder(order);
                            setIsModalOpen(true);
                          }}
                          style={{
                            top: `${topPx}px`,
                            height: `${Math.max(heightPx, 50)}px`,
                          }}
                          className="absolute left-1 right-1 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl shadow-md cursor-pointer transition overflow-hidden flex flex-col justify-between border border-blue-400"
                        >
                          <div className="flex justify-between items-center font-bold text-xs">
                            <span className="truncate">{order.orderNumber}</span>
                            <span className="bg-blue-500/80 px-1.5 py-0.5 rounded text-[10px] shrink-0">{order.price} zł</span>
                          </div>
                          <div className="font-semibold text-xs truncate">{order.clientName}</div>
                          <div className="text-[10px] text-blue-100 truncate">📍 {order.addressLine1}</div>
                          <div className="text-[9px] bg-blue-800/80 px-1 py-0.5 rounded inline-block font-mono mt-0.5">
                            ⏱️ {startTime} - {endTime}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Модалка редактирования заказа при клике */}
      <OrderModal
        order={editingOrder}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingOrder(null);
        }}
        onSave={handleSaveOrder}
      />
    </div>
  );
}
