"use client";
import React, { useState, useEffect } from 'react';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // от 08:00 до 21:00
const MINUTE_WIDTH = 2; // 1 минута = 2px (1 час = 120px)

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Модальное окно
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderDetail | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resCl, resOrd] = await Promise.all([
        fetch('/api/cleaners'),
        fetch('/api/orders')
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

  // Фильтруем заказы для выбранной даты и исключаем отмененные
  const dayOrders = orders.filter(o => {
    if (o.status === 'CANCELLED') return false;
    const orderDate = new Date(o.date).toISOString().split('T')[0];
    return orderDate === selectedDate;
  });

  const handleSaveOrder = async (savedOrder: OrderDetail) => {
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedOrder),
      });
      setIsModalOpen(false);
      loadData(); // Перезагружаем данные
    } catch (e) {
      console.error(e);
      alert('Ошибка при сохранении заказа');
    }
  };

  // Функция для расчета позиции и ширины блока на таймлайне
  const getEventStyle = (startTime: string, endTime: string) => {
    const [startH, startM] = (startTime || '10:00').split(':').map(Number);
    const [endH, endM] = (endTime || '13:00').split(':').map(Number);
    
    // Смещение от 08:00 в минутах
    const offsetMinutes = (startH - 8) * 60 + startM;
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);

    return {
      left: `${Math.max(0, offsetMinutes * MINUTE_WIDTH)}px`,
      width: `${Math.max(30, durationMinutes * MINUTE_WIDTH)}px`, // минимум 30 мин визуально
    };
  };

  const changeDay = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden max-w-[1600px] mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
      
      {/* Шапка журнала */}
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-base font-bold text-slate-900">📅 Журнал смен</h1>
            <p className="text-[11px] text-slate-500">График клинеров на день</p>
          </div>
          
          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <button onClick={() => changeDay(-1)} className="px-3 py-1.5 hover:bg-slate-100 text-slate-600 font-bold transition">◀</button>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1.5 text-xs font-bold text-slate-800 border-x border-slate-200 outline-none"
            />
            <button onClick={() => changeDay(1)} className="px-3 py-1.5 hover:bg-slate-100 text-slate-600 font-bold transition">▶</button>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingOrder(null);
            setIsModalOpen(true);
          }}
          className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
        >
          + Создать заказ
        </button>
      </div>

      {/* Основная сетка таймлайна */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Левая колонка: Имена клинеров */}
        <div className="w-48 flex-shrink-0 border-r border-slate-200 bg-white z-20 flex flex-col">
          <div className="h-10 border-b border-slate-100 bg-slate-50 flex items-center px-3 sticky top-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Сотрудник</span>
          </div>
          <div className="flex-1 overflow-y-auto hide-scrollbar pb-20">
            {cleaners.map(c => (
              <div key={c.id} className="h-16 border-b border-slate-100 px-3 flex flex-col justify-center">
                <span className="text-xs font-bold text-slate-900 truncate">{c.name}</span>
                <span className="text-[10px] text-slate-500 truncate">📍 {c.district}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Правая часть: Сетка часов (скроллится по X и Y) */}
        <div className="flex-1 overflow-auto bg-slate-50 relative pb-20">
          
          {/* Шапка часов (08:00, 09:00...) */}
          <div className="flex h-10 border-b border-slate-100 bg-slate-50 sticky top-0 z-10 min-w-max">
            {HOURS.map(h => (
              <div 
                key={h} 
                style={{ width: `${60 * MINUTE_WIDTH}px` }} 
                className="flex-shrink-0 border-r border-slate-200 px-2 flex items-center text-[10px] font-bold text-slate-400"
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Строки клинеров с их заказами */}
          <div className="min-w-max relative">
            {loading && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                <span className="text-slate-500 text-xs font-bold">Синхронизация графика...</span>
              </div>
            )}
            
            {/* Отрисовка вертикальных линий часов на фоне */}
            <div className="absolute inset-0 flex pointer-events-none opacity-20">
              {HOURS.map(h => (
                <div key={h} style={{ width: `${60 * MINUTE_WIDTH}px` }} className="flex-shrink-0 border-r border-slate-300"></div>
              ))}
            </div>

            {cleaners.map(cleaner => {
              // Ищем заказы, где участвует этот клинер
              const myOrders = dayOrders.filter(o => 
                o.assignedCleaners?.some((ac: any) => ac.cleanerId === cleaner.id || ac.cleaner?.id === cleaner.id)
              );

              return (
                <div key={cleaner.id} className="h-16 border-b border-slate-200/50 relative hover:bg-slate-100/50 transition">
                  {myOrders.map(order => {
                    const style = getEventStyle(order.startTime, order.endTime);
                    const isGroup = order.assignedCleaners?.length > 1;

                    return (
                      <div
                        key={order.id}
                        style={style}
                        onClick={() => {
                          setEditingOrder(order);
                          setIsModalOpen(true);
                        }}
                        className={`absolute top-1.5 bottom-1.5 rounded-lg shadow-sm cursor-pointer overflow-hidden border p-1.5 transition hover:shadow-md hover:z-10 ${
                          order.status === 'COMPLETED' ? 'bg-purple-100 border-purple-300' :
                          order.status === 'PROCESSING' ? 'bg-blue-100 border-blue-300' :
                          'bg-emerald-100 border-emerald-300'
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-[9px] font-extrabold px-1 py-0.5 rounded bg-white/60 text-slate-800 leading-none">
                            {order.startTime} - {order.endTime}
                          </span>
                          {isGroup && <span className="text-[10px]" title="Бригадная уборка">👥</span>}
                        </div>
                        <div className="text-[10px] font-bold text-slate-900 truncate leading-tight">
                          {order.clientName || 'Новый клиент'}
                        </div>
                        <div className="text-[9px] text-slate-600 truncate">
                          📍 {order.addressLine1}
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

      {isModalOpen && (
        <OrderModal
          order={editingOrder}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveOrder}
        />
      )}
      
      {/* Скрываем скроллбар в левой колонке через CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
