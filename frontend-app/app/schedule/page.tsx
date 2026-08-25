"use client";
import React, { useState, useEffect } from 'react';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

// Безопасное форматирование даты в локальный YYYY-MM-DD без UTC-сдвига
const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function SchedulePage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Модалка заказа
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderDetail | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/orders');
      if (res.ok) {
        setOrders(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleSaveOrder = async (savedOrder: OrderDetail) => {
    try {
      const isExisting = Boolean((savedOrder as any).id);
      const url = isExisting ? `/api/orders/${(savedOrder as any).id}` : '/api/orders';
      const method = isExisting ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedOrder),
      });

      if (res.ok) {
        setIsModalOpen(false);
        loadOrders();
      } else {
        alert('Ошибка при сохранении заказа');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка соединения с сервером');
    }
  };

  // Навигация по неделям
  const changeWeek = (direction: number) => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + direction * 7);
    setCurrentDate(next);
  };

  // 7 дней текущей недели (начиная с понедельника)
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const todayStr = formatLocalDate(new Date());
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  if (loading) return <div className="p-10 text-center text-slate-500 text-xs">Загрузка расписания...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      {/* Шапка расписания */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">🗓 Календарь и сетка уборок</h1>
          <p className="text-xs text-slate-500">Наглядное распределение заказов по дням недели</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => changeWeek(-1)}
              className="px-3 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600"
            >
              ← Пред. неделя
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-800"
            >
              Сегодня
            </button>
            <button
              onClick={() => changeWeek(1)}
              className="px-3 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600"
            >
              След. неделя →
            </button>
          </div>

          <button
            onClick={() => {
              setEditingOrder(null);
              setIsModalOpen(true);
            }}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm"
          >
            + Добавить заказ
          </button>
        </div>
      </div>

      {/* Сетка недели */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 flex-1 overflow-hidden">
        {weekDays.map((day, idx) => {
          const dateStr = formatLocalDate(day);
          const isToday = todayStr === dateStr;

          const dayOrders = orders.filter((o: any) => {
            const orderDateStr = formatLocalDate(new Date(o.date));
            return orderDateStr === dateStr && o.status !== 'CANCELLED';
          });

          return (
            <div
              key={idx}
              className={`bg-white border rounded-2xl flex flex-col overflow-hidden shadow-sm ${
                isToday ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200'
              }`}
            >
              {/* Шапка дня */}
              <div className={`p-3 text-center border-b ${isToday ? 'bg-brand-50 text-brand-700' : 'bg-slate-50 text-slate-700'}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider">{dayNames[idx]}</div>
                <div className="text-base font-extrabold">{day.getDate()}</div>
                <span className="text-[10px] text-slate-400 font-semibold">{dayOrders.length} уборок</span>
              </div>

              {/* Список заказов */}
              <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                {dayOrders.map((order: any) => {
                  const team = order.assignedCleaners?.map((ac: any) => ac.cleaner?.name).join(', ');

                  return (
                    <div
                      key={order.id}
                      onClick={() => {
                        setEditingOrder(order);
                        setIsModalOpen(true);
                      }}
                      className="p-2.5 bg-slate-50 hover:bg-brand-50/60 border border-slate-200 rounded-xl cursor-pointer transition text-left"
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-brand-600">{order.timeSlot?.split('—')[0]?.trim() || order.startTime || '10:00'}</span>
                        <span className="text-emerald-600 font-extrabold">{order.price} zł</span>
                      </div>

                      <div className="font-bold text-xs text-slate-900 mt-1 truncate">
                        {order.clientName || 'Без имени'}
                      </div>

                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        📍 {order.addressLine1 || 'Адрес не указан'}
                      </div>

                      {team && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 flex items-center gap-1 text-[9px] text-slate-600 font-semibold">
                          <span>👤</span>
                          <span className="truncate">{team}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {dayOrders.length === 0 && (
                  <div className="text-center py-8 text-[11px] text-slate-300 font-medium">
                    Нет уборок
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <OrderModal
          order={editingOrder}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveOrder}
        />
      )}
    </div>
  );
}
