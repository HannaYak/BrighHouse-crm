"use client";
import React, { useState, useEffect } from 'react';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

const START_HOUR = 8;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);
const ROW_HEIGHT = 64;

export default function SchedulePage() {
  const [allCleaners, setAllCleaners] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [onlyWorkingToday, setOnlyWorkingToday] = useState(true);

  const [editingOrder, setEditingOrder] = useState<OrderDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedOrder, setDraggedOrder] = useState<any>(null);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [cleanersRes, ordersRes] = await Promise.all([
        fetch('/api/cleaners'),
        fetch('/api/orders')
      ]);
      
      if (cleanersRes.ok) setAllCleaners(await cleanersRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
    } catch (e) {
      console.error('Ошибка загрузки:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentDayOfWeek = (() => {
    const d = new Date(selectedDate).getDay();
    return d === 0 ? 7 : d;
  })();

  const visibleCleaners = allCleaners.filter((c) => {
    if (!onlyWorkingToday) return true;
    const days: number[] = c.workDays && c.workDays.length > 0 ? c.workDays : [1, 2, 3, 4, 5];
    return days.includes(currentDayOfWeek);
  });

  const dayOrders = orders.filter((o: any) => {
    if (!o.date) return false;
    const orderDateStr = new Date(o.date).toISOString().slice(0, 10);
    return orderDateStr === selectedDate && o.status !== 'CANCELLED';
  });

  const gridStyle = {
    gridTemplateColumns: `80px repeat(${Math.max(visibleCleaners.length, 1)}, minmax(180px, 1fr))`,
  };

  const handleCellClick = (hour: number, cleaner: any) => {
    const startStr = `${hour < 10 ? '0' + hour : hour}:00`;
    const endHour = Math.min(20, hour + 3);
    const endStr = `${endHour < 10 ? '0' + endHour : endHour}:00`;

    const newOrderTemplate: OrderDetail = {
      date: selectedDate,
      startTime: startStr,
      endTime: endStr,
      timeSlot: `${startStr} — ${endStr}`,
      serviceType: 'STANDARD',
      areaM2: 45,
      roomsCount: 1,
      bathroomsCount: 1,
      windowsCount: 0,
      hasOven: false,
      hasFridge: false,
      hasFridgeFreeze: false,
      hasMicrowave: false,
      hasBalcony: false,
      hasKitchenClosets: false,
      hasStairs: false,
      hasSteamer: false,
      hasDishesHours: 0,
      hasIroningHours: 0,
      hasVacuum: false,
      hasPets: false,
      hasKeys: false,
      drySofa2: 0,
      drySofa3: 0,
      drySofaCorner4: 0,
      dryArmchair: 0,
      clientName: '',
      clientPhone: '',
      addressLine1: '',
      price: 170,
      cleanersCount: 1,
      assignedCleaners: [{ id: cleaner.id, name: cleaner.name, district: cleaner.district }],
      notes: '',
    };

    setEditingOrder(newOrderTemplate);
    setIsModalOpen(true);
  };

  const handleSaveOrder = async (saved: OrderDetail) => {
    try {
      const payload = {
        ...saved,
        date: saved.date || selectedDate,
        assignedCleaners: (saved.assignedCleaners || []).map((c: any) => ({
          id: typeof c === 'object' ? c.id : c
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await loadData(true);
        setIsModalOpen(false);
        setEditingOrder(null);
      } else {
        alert('Ошибка сохранения заказа');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка соединения с сервером');
    }
  };

  const handleDropOnCell = async (cleanerId: number, targetHour: number) => {
    if (!draggedOrder) return;

    const parts = (draggedOrder.timeSlot || draggedOrder.startTime || '10:00 — 13:00').split('—').map((s: string) => s.trim());
    const [origStartH] = (parts[0] || '10:00').split(':').map(Number);
    const [origEndH] = (parts[1] || '13:00').split(':').map(Number);
    const duration = Math.max(1, (origEndH || origStartH + 3) - origStartH);

    const newStartStr = `${targetHour < 10 ? '0' + targetHour : targetHour}:00`;
    const newEndH = Math.min(20, targetHour + duration);
    const newEndStr = `${newEndH < 10 ? '0' + newEndH : newEndH}:00`;

    const payload = {
      ...draggedOrder,
      date: selectedDate,
      startTime: newStartStr,
      endTime: newEndStr,
      timeSlot: `${newStartStr} — ${newEndStr}`,
      assignedCleaners: [{ id: cleanerId }],
    };

    setDraggedOrder(null);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) await loadData(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResizeOrder = async (order: any, newDurationHours: number) => {
    const slot = order.timeSlot || order.startTime || '10:00 — 14:00';
    const [startH] = slot.split(':').map(Number);
    const endH = Math.min(20, startH + Math.max(1, newDurationHours));
    const startStr = `${startH < 10 ? '0' + startH : startH}:00`;
    const endStr = `${endH < 10 ? '0' + endH : endH}:00`;

    const payload = {
      ...order,
      date: selectedDate,
      startTime: startStr,
      endTime: endStr,
      timeSlot: `${startStr} — ${endStr}`,
      assignedCleaners: (order.assignedCleaners || []).map((c: any) => ({ id: c.cleanerId || c.id })),
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) await loadData(true);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-10 text-center text-xs text-slate-500">Загрузка расписания...</div>;

  return (
    <div className="space-y-6 max-w-full mx-auto pb-12 px-4">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📅 Расписание смен</h1>
          <p className="text-xs text-slate-500">Перетаскивайте заказ на нужного клинера и время. Клик по пустому месту — создать заказ.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setOnlyWorkingToday(!onlyWorkingToday)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              onlyWorkingToday
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {onlyWorkingToday ? '✅ Только работающие сегодня' : '👥 Все сотрудники'}
          </button>

          <button
            type="button"
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().slice(0, 10));
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold"
          >
            ←
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
          />

          <button
            type="button"
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().slice(0, 10));
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold"
          >
            →
          </button>
        </div>
      </div>

      {/* Сетка расписания */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto select-none">
        <div className="min-w-[900px]">
          {/* Шапка клинеров */}
          <div className="grid border-b border-slate-200 bg-slate-50 sticky top-0 z-20" style={gridStyle}>
            <div className="p-3 text-center text-xs font-bold text-slate-400 border-r border-slate-200 flex items-center justify-center">
              Время
            </div>
            {visibleCleaners.map((cleaner) => (
              <div key={cleaner.id} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                <div className="font-bold text-xs text-slate-900 truncate">{cleaner.name}</div>
                <span className="text-[10px] text-slate-400 block truncate">📍 {cleaner.district || 'Центр'}</span>
              </div>
            ))}
            {visibleCleaners.length === 0 && (
              <div className="p-3 text-xs text-slate-400 col-span-full text-center">Нет клинеров на смене</div>
            )}
          </div>

          {/* Строки часов и интерактивные слоты */}
          <div className="relative">
            <div className="divide-y divide-slate-100">
              {HOURS.map((hour) => {
                const hourStr = `${hour < 10 ? '0' + hour : hour}:00`;

                return (
                  <div key={hour} className="grid" style={{ ...gridStyle, height: `${ROW_HEIGHT}px` }}>
                    <div className="p-2 text-center text-xs font-mono font-bold text-slate-400 border-r border-slate-100 bg-slate-50/50 flex items-center justify-center">
                      {hourStr}
                    </div>

                    {visibleCleaners.map((cleaner) => (
                      <div
                        key={cleaner.id}
                        onClick={() => handleCellClick(hour, cleaner)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('bg-blue-50/60');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('bg-blue-50/60');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('bg-blue-50/60');
                          handleDropOnCell(cleaner.id, hour);
                        }}
                        className="border-r border-slate-100 last:border-r-0 bg-white hover:bg-slate-50/50 transition relative"
                      />
                    ))}
                  </div>
                );
              })}
            </div>

          {/* Карточки заказов */}
<div className="absolute inset-0 grid pointer-events-none z-10" style={gridStyle}>
  <div></div>

  {visibleCleaners.map((cleaner) => {
    // Находим ВСЕ заказы, где этот клинер назначен (через cleanerId или id)
    const cleanerOrders = dayOrders.filter((o) =>
      o.assignedCleaners?.some((ac: any) => {
        const cId = ac.cleanerId || ac.cleaner?.id || ac.id;
        return Number(cId) === Number(cleaner.id);
      })
    );

    return (
      <div key={cleaner.id} className="relative border-r border-transparent last:border-r-0">
        {cleanerOrders.map((order) => {
          const slot = order.timeSlot || `${order.startTime || '10:00'} — ${order.endTime || '14:00'}`;
          const parts = slot.split('—').map((s: string) => s.trim());
          const startTime = parts[0] || order.startTime || '10:00';
          const endTime = parts[1] || order.endTime || '14:00';

          const [startH, startM] = startTime.split(':').map(Number);
          const [endH, endM] = endTime.split(':').map(Number);

          const safeStartH = isNaN(startH) ? 10 : startH;
          const safeStartM = isNaN(startM) ? 0 : startM;
          const safeEndH = isNaN(endH) ? safeStartH + 3 : endH;
          const safeEndM = isNaN(endM) ? 0 : endM;

          const startMinutes = (safeStartH - START_HOUR) * 60 + safeStartM;
          const durationMinutes = Math.max(30, (safeEndH * 60 + safeEndM) - (safeStartH * 60 + safeStartM));

          const topPx = (startMinutes / 60) * ROW_HEIGHT;
          const heightPx = (durationMinutes / 60) * ROW_HEIGHT - 4;

          // Проверяем, парная ли уборка
          const totalAssigned = order.assignedCleaners?.length || 1;
          const isPair = totalAssigned > 1;

          return (
            <div
              key={`${order.id}-${cleaner.id}`}
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                setDraggedOrder(order);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
                  setEditingOrder({
                    ...order,
                    date: selectedDate,
                    startTime,
                    endTime,
                    assignedCleaners: (order.assignedCleaners || []).map((ac: any) => ac.cleaner || ac),
                  });
                  setIsModalOpen(true);
                }
              }}
              style={{
                top: `${topPx}px`,
                height: `${Math.max(heightPx, 44)}px`,
              }}
              className={`absolute left-1.5 right-1.5 text-white p-2 rounded-xl shadow-md cursor-move active:opacity-50 transition overflow-hidden flex flex-col justify-between border pointer-events-auto group ${
                isPair 
                  ? 'bg-indigo-600 hover:bg-indigo-700 border-indigo-400' 
                  : 'bg-blue-600 hover:bg-blue-700 border-blue-400'
              }`}
            >
              <div>
                <div className="flex justify-between items-center font-bold text-xs">
                  <span className="truncate">{order.orderNumber}</span>
                  <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] shrink-0 font-mono">
                    {order.price} zł
                  </span>
                </div>
                <div className="font-semibold text-xs truncate mt-0.5">
                  {isPair ? '👥 ' : ''}{order.clientName || 'Без имени'}
                </div>
                <div className="text-[10px] text-white/80 truncate">📍 {order.addressLine1}</div>
              </div>

              <div className="flex justify-between items-center mt-1">
                <span className="text-[9px] bg-black/25 px-1.5 py-0.5 rounded font-mono">
                  ⏱️ {startTime} - {endTime} {isPair ? `(бригада: ${totalAssigned})` : ''}
                </span>
              </div>

              {/* Полоска изменения длительности */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const startY = e.clientY;
                  const initialH = heightPx;
                  let newDur = Math.max(1, Math.round(initialH / ROW_HEIGHT));
                  const cardEl = (e.target as HTMLElement).parentElement;

                  const onMouseMove = (mEv: MouseEvent) => {
                    const dY = mEv.clientY - startY;
                    const curH = Math.max(40, initialH + dY);
                    newDur = Math.max(1, Math.round(curH / ROW_HEIGHT));
                    if (cardEl) cardEl.style.height = `${curH}px`;
                  };

                  const onMouseUp = async () => {
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                    await handleResizeOrder(order, newDur);
                  };

                  window.addEventListener('mousemove', onMouseMove);
                  window.addEventListener('mouseup', onMouseUp);
                }}
                className="resize-handle absolute bottom-0 left-0 right-0 h-2.5 bg-white/30 hover:bg-amber-400 cursor-s-resize opacity-0 group-hover:opacity-100 transition"
                title="Потяните для изменения времени"
              />
            </div>
          );
        })}
      </div>
    );
  })}
</div>

      {/* Модалка заказа */}
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
