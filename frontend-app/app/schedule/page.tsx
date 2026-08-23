"use client";
import React, { useState, useEffect } from 'react';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resCl, resOrd] = await Promise.all([
        fetch('/api/cleaners'),
        fetch('/api/orders'),
      ]);
      if (resCl.ok) setCleaners(await resCl.json());
      if (resOrd.ok) setOrders(await resOrd.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const dayOrders = orders.filter((o) => {
    const oDate = new Date(o.date).toISOString().split('T')[0];
    return oDate === selectedDate && o.status !== 'CANCELLED';
  });

  const getPositionForTime = (timeSlot: string) => {
    const [start] = timeSlot.split(' — ');
    const [h, m] = (start || '10:00').split(':').map(Number);
    const totalMinutesFrom8 = (h - 8) * 60 + (m || 0);
    return Math.max(0, (totalMinutesFrom8 / 60) * 64); // 64px на 1 час
  };

  const getHeightForDuration = (timeSlot: string) => {
    const [start, end] = timeSlot.split(' — ');
    const [sh, sm] = (start || '10:00').split(':').map(Number);
    const [eh, em] = (end || '14:00').split(':').map(Number);
    const durMins = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
    return Math.max(32, (durMins / 60) * 64);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3">
      {/* Шапка управления датой */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-slate-900">📅 Журнал записей дня (Сетка смен)</h1>
          <span className="text-xs text-slate-400">|</span>
          <span className="text-xs font-semibold text-slate-600">
            Заказов на дату: <b className="text-brand-600">{dayOrders.length}</b>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition"
          >
            Сегодня
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1 text-xs font-bold text-slate-800"
          />
          <button
            onClick={() => {
              setSelectedOrder(null);
              setIsModalOpen(true);
            }}
            className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm transition"
          >
            + Записать заказ
          </button>
        </div>
      </div>

      {/* Интерактивная сетка расписания (Beauty Pro стиль) */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-auto shadow-sm flex">
        {/* Временная шкала слева */}
        <div className="w-16 flex-shrink-0 border-r border-slate-200 bg-slate-50/70 pt-12">
          {HOURS.map((h) => (
            <div key={h} className="h-16 border-b border-slate-100 text-[11px] font-mono text-slate-400 text-right pr-2">
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Дорожки клинеров */}
        <div className="flex-1 flex overflow-x-auto">
          {cleaners.map((cleaner) => {
            const cleanerOrders = dayOrders.filter((o) =>
              o.assignedCleaners?.some((ac: any) => ac.cleanerId === cleaner.id || ac.cleaner?.id === cleaner.id)
            );

            return (
              <div key={cleaner.id} className="w-56 flex-shrink-0 border-r border-slate-200 flex flex-col relative">
                {/* Шапка сотрудника */}
                <div className="h-12 bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex flex-col justify-center sticky top-0 z-10">
                  <div className="font-bold text-xs text-slate-900 truncate">🙋‍♀️ {cleaner.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">Смена: 09:00 — 19:00 • {cleaner.district}</div>
                </div>

                {/* Полотно часов с сеткой */}
                <div className="relative h-[896px] bg-white">
                  {HOURS.map((h) => (
                    <div key={h} className="h-16 border-b border-slate-100/80" />
                  ))}

                  {/* Карточки заказов на дорожке сотрудника */}
                  {cleanerOrders.map((ord) => {
                    const top = getPositionForTime(ord.timeSlot);
                    const height = getHeightForDuration(ord.timeSlot);
                    const isPair = ord.assignedCleaners?.length > 1;

                    return (
                      <div
                        key={ord.id}
                        onClick={() => {
                          setSelectedOrder(ord);
                          setIsModalOpen(true);
                        }}
                        style={{ top: `${top}px`, height: `${height}px` }}
                        className={`absolute left-1.5 right-1.5 rounded-xl p-2.5 cursor-pointer shadow-sm border transition flex flex-col justify-between overflow-hidden ${
                          isPair
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 hover:border-indigo-500'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:border-emerald-500'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-extrabold">
                            <span>⏱️ {ord.timeSlot}</span>
                            <span>{ord.price} zł</span>
                          </div>
                          <div className="font-bold text-xs truncate mt-0.5">{ord.clientName}</div>
                          <div className="text-[10px] truncate opacity-75">📍 {ord.addressLine1}</div>
                        </div>

                        {isPair && (
                          <div className="text-[9px] font-bold bg-white/80 px-1 py-0.5 rounded text-indigo-800 truncate">
                            👥 В паре: {ord.assignedCleaners.map((c: any) => c.cleaner?.name || c.name).join(' + ')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <OrderModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async (saved) => {
          await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saved),
          });
          loadData();
        }}
      />
    </div>
  );
}
