"use client";
import React, { useState, useEffect } from 'react';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // с 8:00 до 20:00
const ROW_HEIGHT = 64; // высота одного часа в пикселях

export default function SchedulePage() {
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Модалка редактирования
  const [editingOrder, setEditingOrder] = useState<OrderDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Стейты для перетаскивания и ресайза карточки мышкой
  const [draggingOrder, setDraggingOrder] = useState<any>(null);
  const [resizingOrder, setResizingOrder] = useState<any>(null);

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

  // Функция изменения времени/клинера при перетаскивании или ресайзе
 // Безопасное обновление времени/клинера при перетаскивании или ресайзе
  const updateOrderSlot = async (order: any, newStartHour: number, newDurationHours: number, newCleanerId?: number) => {
    try {
      const startStr = `${newStartHour < 10 ? '0' + newStartHour : newStartHour}:00`;
      const endH = Math.min(20, newStartHour + Math.max(1, newDurationHours));
      const endStr = `${endH < 10 ? '0' + endH : endH}:00`;

      // Собираем ID клинеров в правильном формате для бэкенда
      let cleanIds: number[] = [];
      if (newCleanerId) {
        cleanIds = [newCleanerId];
      } else if (order.assignedCleaners) {
        cleanIds = order.assignedCleaners.map((c: any) => c.cleanerId || c.id).filter(Boolean);
      }

      const payload = {
        id: order.id,
        orderNumber: order.orderNumber,
        clientName: order.clientName || 'Клиент',
        clientPhone: order.clientPhone || '',
        addressLine1: order.addressLine1 || '',
        addressLine2: order.addressLine2 || '',
        serviceType: order.serviceType || 'STANDARD',
        status: order.status || 'NEW',
        price: Number(order.price) || 0,
        areaM2: Number(order.areaM2) || 45,
        roomsCount: Number(order.roomsCount) || 1,
        bathroomsCount: Number(order.bathroomsCount) || 1,
        windowsCount: Number(order.windowsCount) || 0,
        date: order.date,
        startTime: startStr,
        endTime: endStr,
        timeSlot: `${startStr} — ${endStr}`,
        assignedCleaners: cleanIds.map(id => ({ id })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        loadData();
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Ошибка от сервера:', errData);
        alert('Не удалось сохранить изменения заказа');
      }
    } catch (e) {
      console.error('Ошибка сети при обновлении заказа:', e);
      alert('Ошибка соединения с сервером');
    }
  };
  if (loading) return <div className="p-10 text-center text-xs text-slate-500">Загрузка расписания...</div>;

  return (
    <div className="space-y-6 max-w-full mx-auto pb-12 px-4">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📅 Календарь-таймлайн смен (BeautyPro стиль)</h1>
          <p className="text-xs text-slate-500">Кликните для открытия, тяните за нижний край для изменения длительности или перетаскивайте между клинерами.</p>
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
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto select-none">
        <div className="min-w-[900px] relative">
          {/* Шапка клинеров */}
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

          {/* Строки часов */}
          <div className="relative">
            <div className="divide-y divide-slate-100">
              {HOURS.map((hour) => {
                const hourStr = `${hour < 10 ? '0' + hour : hour}:00`;
                return (
                  <div key={hour} className="grid" style={{ ...gridStyle, height: `${ROW_HEIGHT}px` }}>
                    <div className="p-2 text-center text-xs font-mono font-bold text-slate-400 border-r border-slate-100 bg-slate-50/50 flex items-center justify-center">
                      {hourStr}
                    </div>
                    {cleaners.map((cleaner) => (
                      <div
                        key={cleaner.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggingOrder) {
                            const order = JSON.parse(e.dataTransfer.getData('text/plain'));
                            const slot = order.timeSlot || order.startTime || '10:00 — 14:00';
                            const [startH] = slot.split(':').map(Number);
                            const [endH] = slot.split('—')[1]?.trim().split(':').map(Number) || [startH + 3];
                            const duration = Math.max(1, endH - startH);
                            updateOrderSlot(order, hour, duration, cleaner.id);
                            setDraggingOrder(null);
                          }
                        }}
                        className="border-r border-slate-100 last:border-r-0 bg-white hover:bg-blue-50/20 transition"
                      ></div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Карточки заказов */}
            <div className="absolute inset-0 grid pointer-events-none z-10" style={gridStyle}>
              <div></div>

              {cleaners.map((cleaner) => {
                const cleanerOrders = dayOrders.filter((o) =>
                  o.assignedCleaners?.some((ac: any) => ac.cleanerId === cleaner.id)
                );

                return (
                  <div key={cleaner.id} className="relative border-r border-transparent last:border-r-0 pointer-events-auto">
                    {cleanerOrders.map((order) => {
                      const slot = order.timeSlot || order.startTime || '10:00 — 14:00';
                      const parts = slot.split('—').map((s: string) => s.trim());
                      const startTime = parts[0] || '10:00';
                      const endTime = parts[1] || '14:00';

                      const [startH, startM] = startTime.split(':').map(Number);
                      const [endH, endM] = endTime.split(':').map(Number);

                      const startMinutes = (startH - 8) * 60 + (startM || 0);
                      const durationMinutes = Math.max(60, (endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0)));

                      const topPx = (startMinutes / 60) * ROW_HEIGHT;
                      const heightPx = (durationMinutes / 60) * ROW_HEIGHT - 4;

                      return (
                        <div
                          key={order.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', JSON.stringify(order));
                            setDraggingOrder(order);
                          }}
                          onClick={(e) => {
                            // Открываем модалку только если не кликнули на ручку ресайза
                            if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
                              setEditingOrder(order);
                              setIsModalOpen(true);
                            }
                          }}
                          style={{
                            top: `${topPx}px`,
                            height: `${Math.max(heightPx, 50)}px`,
                          }}
                          className="absolute left-1 right-1 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl shadow-md cursor-grab active:cursor-grabbing transition overflow-hidden flex flex-col justify-between border border-blue-400 group"
                        >
                          <div>
                            <div className="flex justify-between items-center font-bold text-xs">
                              <span className="truncate">{order.orderNumber}</span>
                              <span className="bg-blue-500/80 px-1.5 py-0.5 rounded text-[10px] shrink-0">{order.price} zł</span>
                            </div>
                            <div className="font-semibold text-xs truncate mt-0.5">{order.clientName}</div>
                            <div className="text-[10px] text-blue-100 truncate">📍 {order.addressLine1}</div>
                          </div>

                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[9px] bg-blue-800/80 px-1.5 py-0.5 rounded font-mono">
                              ⏱️ {startTime} - {endTime}
                            </span>
                          </div>

                          {/* Ручка изменения длительности мышкой внизу карточки */}
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const startY = e.clientY;
                              const initialHeight = heightPx;

                              const onMouseMove = (moveEvent: MouseEvent) => {
                                const deltaY = moveEvent.clientY - startY;
                                const newHeight = Math.max(50, initialHeight + deltaY);
                                const newDurationHours = Math.max(1, Math.round(newHeight / ROW_HEIGHT));
                                updateOrderSlot(order, startH, newDurationHours);
                              };

                              const onMouseUp = () => {
                                window.removeEventListener('mousemove', onMouseMove);
                                window.removeEventListener('mouseup', onMouseUp);
                              };

                              window.addEventListener('mousemove', onMouseMove);
                              window.addEventListener('mouseup', onMouseUp);
                            }}
                            className="resize-handle absolute bottom-0 left-0 right-0 h-2 bg-blue-400/50 hover:bg-blue-300 cursor-s-resize opacity-0 group-hover:opacity-100 transition"
                            title="Потяните для изменения длительности"
                          ></div>
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

      {/* Модалка редактирования заказа */}
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
