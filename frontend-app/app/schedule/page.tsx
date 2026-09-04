"use client";
import React, { useState, useEffect } from 'react';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // с 8:00 до 20:00

export default function SchedulePage() {
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

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

  // Фильтруем заказы строго на выбранную дату
  const dayOrders = orders.filter((o: any) => {
    if (!o.date) return false;
    const orderDateStr = new Date(o.date).toISOString().slice(0, 10);
    return orderDateStr === selectedDate && o.status !== 'CANCELLED';
  });

  if (loading) return <div className="p-10 text-center text-xs text-slate-500">Загрузка расписания...</div>;

  return (
    <div className="space-y-6 max-w-full mx-auto pb-12 px-4">
      {/* Шапка с переключателем дат */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📅 Календарь-таймлайн смен</h1>
          <p className="text-xs text-slate-500">Занятость клинеров по часам на выбранный день</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().slice(0, 10));
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold"
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
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold"
          >
            Следующий день →
          </button>
        </div>
      </div>

      {/* Таймлайн сетка (Колонки = Клинеры, Строки = Часы) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Шапка таблицы с именами клинеров */}
          <div className="grid grid-cols-[80px_repeat(auto-fit,minmax(180px,1fr))] border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
            <div className="p-3 text-center text-xs font-bold text-slate-400 border-r border-slate-200">Время</div>
            {cleaners.map((cleaner) => (
              <div key={cleaner.id} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                <div className="font-bold text-xs text-slate-900">{cleaner.name}</div>
                <span className="text-[10px] text-slate-400">📍 {cleaner.district || 'Центр'}</span>
              </div>
            ))}
          </div>

          {/* Тело сетки по часам */}
          <div className="divide-y divide-slate-100">
            {HOURS.map((hour) => {
              const hourStr = `${hour < 10 ? '0' + hour : hour}:00`;

              return (
                <div key={hour} className="grid grid-cols-[80px_repeat(auto-fit,minmax(180px,1fr))] min-h-[64px]">
                  {/* Колонка времени */}
                  <div className="p-2 text-center text-xs font-mono font-bold text-slate-400 border-r border-slate-100 bg-slate-50/50 flex items-center justify-center">
                    {hourStr}
                  </div>

                  {/* Ячейки клинеров для этого часа */}
                  {cleaners.map((cleaner) => {
                    // Ищем заказы, которые привязаны к этому клинеру и идут в этот час
                    const cleanerOrders = dayOrders.filter((o) => {
                      const isAssigned = o.assignedCleaners?.some((ac: any) => ac.cleanerId === cleaner.id);
                      if (!isAssigned) return false;

                      const slot = o.timeSlot || o.startTime || '10:00';
                      const startHour = parseInt(slot.split(':')[0], 10);
                      return startHour === hour;
                    });

                    return (
                      <div key={cleaner.id} className="p-1.5 border-r border-slate-100 last:border-r-0 relative bg-white hover:bg-slate-50/50 transition">
                        {cleanerOrders.map((order) => (
                          <div
                            key={order.id}
                            className="bg-blue-600 text-white p-2.5 rounded-xl shadow-xs space-y-1 text-xs"
                          >
                            <div className="flex justify-between items-center font-bold">
                              <span>{order.orderNumber}</span>
                              <span className="bg-blue-500 px-1.5 py-0.5 rounded text-[10px]">{order.price} zł</span>
                            </div>
                            <div className="font-medium truncate">{order.clientName}</div>
                            <div className="text-[10px] text-blue-100 truncate">📍 {order.addressLine1}</div>
                            <div className="text-[10px] bg-blue-700/60 px-1.5 py-0.5 rounded inline-block font-mono">
                              ⏱️ {order.timeSlot || order.startTime}
                            </div>
                          </div>
                        ))}
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
  );
}
