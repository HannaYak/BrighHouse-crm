"use client";
import React, { useState, useEffect, useRef } from 'react';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

const START_HOUR = 8;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR); // 8:00 - 20:00
const ROW_HEIGHT = 64; // Высота 1 часа (64px) -> 30 минут = 32px
const STEP_MINUTES = 30; // Шаг примагничивания: 30 минут

export default function SchedulePage() {
  const [allCleaners, setAllCleaners] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [onlyWorkingToday, setOnlyWorkingToday] = useState(true);

  const [editingOrder, setEditingOrder] = useState<OrderDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Стейт активного перетаскивания
  const [activeDrag, setActiveDrag] = useState<{
    order: any;
    initialY: number;
    initialTop: number;
    currentTop: number;
    height: number;
    targetCleanerId: number;
    targetStartTime: string;
    targetEndTime: string;
  } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

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
    gridTemplateColumns: `80px repeat(${Math.max(visibleCleaners.length, 1)}, minmax(190px, 1fr))`,
  };

  // Клик по ячейке для создания заказа
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
      price: 200,
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

  // Мягкий Drag-and-Drop мышкой
  const startCardDrag = (e: React.MouseEvent, order: any, topPx: number, heightPx: number, initialCleanerId: number) => {
    e.stopPropagation();
    e.preventDefault();

    const startY = e.clientY;
    const startX = e.clientX;
    let currentTopVal = topPx;
    let currentCleanerId = initialCleanerId;

    const parts = (order.timeSlot || order.startTime || '10:00 — 14:00').split('—').map((s: string) => s.trim());
    const [origStartH, origStartM] = (parts[0] || '10:00').split(':').map(Number);
    const [origEndH, origEndM] = (parts[1] || '14:00').split(':').map(Number);
    const durationMinutes = Math.max(30, (origEndH * 60 + (origEndM || 0)) - (origStartH * 60 + (origStartM || 0)));

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const rawTop = Math.max(0, topPx + deltaY);

      // Магнитный шаг по 30 минут (32px)
      const pxPerStep = (ROW_HEIGHT / 60) * STEP_MINUTES;
      const snappedTop = Math.round(rawTop / pxPerStep) * pxPerStep;
      currentTopVal = snappedTop;

      // Вычисляем новое время старта
      const totalMinutesFromStart = Math.round((snappedTop / ROW_HEIGHT) * 60);
      const startMinTotal = START_HOUR * 60 + totalMinutesFromStart;
      const endMinTotal = startMinTotal + durationMinutes;

      const calcStartH = Math.floor(startMinTotal / 60);
      const calcStartM = startMinTotal % 60;
      const calcEndH = Math.floor(endMinTotal / 60);
      const calcEndM = endMinTotal % 60;

      const startFormatted = `${String(calcStartH).padStart(2, '0')}:${String(calcStartM).padStart(2, '0')}`;
      const endFormatted = `${String(calcEndH).padStart(2, '0')}:${String(calcEndM).padStart(2, '0')}`;

      // Определяем клинера под курсором по оси X
      if (gridRef.current) {
        const rect = gridRef.current.getBoundingClientRect();
        const mouseX = moveEvent.clientX - rect.left - 80; // вычитаем колонку времени
        const colWidth = (rect.width - 80) / visibleCleaners.length;
        const colIndex = Math.max(0, Math.min(visibleCleaners.length - 1, Math.floor(mouseX / colWidth)));
        if (visibleCleaners[colIndex]) {
          currentCleanerId = visibleCleaners[colIndex].id;
        }
      }

      setActiveDrag({
        order,
        initialY: startY,
        initialTop: topPx,
        currentTop: snappedTop,
        height: heightPx,
        targetCleanerId: currentCleanerId,
        targetStartTime: startFormatted,
        targetEndTime: endFormatted,
      });
    };

    const onMouseUp = async (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      const didMove = Math.abs(upEvent.clientY - startY) > 5 || Math.abs(upEvent.clientX - startX) > 5;

      if (didMove && activeDrag) {
        const payload = {
          ...order,
          date: selectedDate,
          startTime: activeDrag.targetStartTime,
          endTime: activeDrag.targetEndTime,
          timeSlot: `${activeDrag.targetStartTime} — ${activeDrag.targetEndTime}`,
          assignedCleaners: [{ id: activeDrag.targetCleanerId }],
        };

        try {
          const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) await loadData(true);
        } catch (err) {
          console.error('Ошибка сохранения перемещения:', err);
        }
      } else if (!didMove) {
        // Обычный одиночный клик без перетаскивания открывает модалку
        setEditingOrder({
          ...order,
          date: selectedDate,
          assignedCleaners: (order.assignedCleaners || []).map((ac: any) => ac.cleaner || ac),
        });
        setIsModalOpen(true);
      }

      setActiveDrag(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Ресайз карточки (изменение длительности)
  const startResize = (e: React.MouseEvent, order: any, initialHeight: number, startH: number) => {
    e.stopPropagation();
    e.preventDefault();

    const startY = e.clientY;
    let newDurationHours = Math.max(1, Math.round(initialHeight / ROW_HEIGHT));
    const cardEl = (e.target as HTMLElement).parentElement;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const rawHeight = Math.max(40, initialHeight + deltaY);
      newDurationHours = Math.max(1, Math.round(rawHeight / ROW_HEIGHT));
      if (cardEl) {
        cardEl.style.height = `${rawHeight}px`;
      }
    };

    const onMouseUp = async () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      const endH = Math.min(20, startH + newDurationHours);
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
      } catch (err) {
        console.error(err);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  if (loading) return <div className="p-10 text-center text-xs text-slate-500">Загрузка расписания...</div>;

  return (
    <div className="space-y-6 max-w-full mx-auto pb-12 px-4">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📅 Сетка смен (BeautyPro)</h1>
          <p className="text-xs text-slate-500">Плавное перетаскивание мышкой с шагом 30 минут. Клик в пустое место — новая заявка.</p>
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
      <div ref={gridRef} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto select-none relative">
        <div className="min-w-[900px] relative">
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

                    {visibleCleaners.map((cleaner) => (
                      <div
                        key={cleaner.id}
                        onClick={() => handleCellClick(hour, cleaner)}
                        className="border-r border-slate-100 last:border-r-0 bg-white hover:bg-emerald-50/30 cursor-pointer transition relative"
                        title={`Создать уборку на ${hourStr} (${cleaner.name})`}
                      >
                        {/* Разделительная линия получаса (30 мин) */}
                        <div className="absolute top-1/2 left-0 right-0 border-b border-slate-50 pointer-events-none"></div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Карточки заказов */}
            <div className="absolute inset-0 grid pointer-events-none z-10" style={gridStyle}>
              <div></div>

              {visibleCleaners.map((cleaner) => {
                const cleanerOrders = dayOrders.filter((o) =>
                  o.assignedCleaners?.some((ac: any) => ac.cleanerId === cleaner.id)
                );

                return (
                  <div key={cleaner.id} className="relative border-r border-transparent last:border-r-0">
                    {cleanerOrders.map((order) => {
                      const isCurrentlyDragging = activeDrag?.order?.id === order.id;

                      const slot = order.timeSlot || order.startTime || '10:00 — 14:00';
                      const parts = slot.split('—').map((s: string) => s.trim());
                      const startTime = parts[0] || '10:00';
                      const endTime = parts[1] || '14:00';

                      const [startH, startM] = startTime.split(':').map(Number);
                      const [endH, endM] = endTime.split(':').map(Number);

                      const startMinutes = (startH - START_HOUR) * 60 + (startM || 0);
                      const durationMinutes = Math.max(30, (endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0)));

                      const topPx = (startMinutes / 60) * ROW_HEIGHT;
                      const heightPx = (durationMinutes / 60) * ROW_HEIGHT - 4;

                      return (
                        <div
                          key={order.id}
                          onMouseDown={(e) => startCardDrag(e, order, topPx, heightPx, cleaner.id)}
                          style={{
                            top: `${topPx}px`,
                            height: `${Math.max(heightPx, 44)}px`,
                            opacity: isCurrentlyDragging ? 0.25 : 1,
                          }}
                          className="absolute left-1.5 right-1.5 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl shadow-md cursor-grab active:cursor-grabbing transition-all overflow-hidden flex flex-col justify-between border border-blue-400 group pointer-events-auto"
                        >
                          <div>
                            <div className="flex justify-between items-center font-bold text-xs">
                              <span className="truncate">{order.orderNumber}</span>
                              <span className="bg-blue-500/90 px-1.5 py-0.5 rounded text-[10px] shrink-0 font-mono">
                                {order.price} zł
                              </span>
                            </div>
                            <div className="font-semibold text-xs truncate mt-0.5">{order.clientName || 'Без имени'}</div>
                            <div className="text-[10px] text-blue-100 truncate">📍 {order.addressLine1}</div>
                          </div>

                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[9px] bg-blue-800/80 px-1.5 py-0.5 rounded font-mono">
                              ⏱️ {startTime} - {endTime}
                            </span>
                          </div>

                          {/* Полоска изменения длительности снизу */}
                          <div
                            onMouseDown={(e) => startResize(e, order, heightPx, startH)}
                            className="absolute bottom-0 left-0 right-0 h-2.5 bg-blue-400/50 hover:bg-amber-400 cursor-s-resize opacity-0 group-hover:opacity-100 transition"
                            title="Потяните для изменения времени"
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Активный плавающий индикатор перетаскиваемой карточки с подсказкой */}
            {activeDrag && (
              <div
                style={{
                  top: `${activeDrag.currentTop}px`,
                  height: `${activeDrag.height}px`,
                }}
                className="absolute left-20 right-4 bg-brand-500/20 border-2 border-dashed border-brand-500 rounded-xl pointer-events-none z-30 flex items-center justify-center transition-all"
              >
                <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xl border border-slate-700 flex items-center gap-2">
                  <span>🕒 {activeDrag.targetStartTime} — {activeDrag.targetEndTime}</span>
                  <span className="text-emerald-400">
                    ({visibleCleaners.find((c) => c.id === activeDrag.targetCleanerId)?.name})
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
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
