"use client";
import React, { useState, useEffect } from 'react';

const BASE_CHECKLIST = {
  kitchen: {
    title: '🍳 Кухня',
    tasks: [
      'Мытье раковины, смесителя и удаление налета',
      'Очистка рабочей столешницы и кухонного фартука',
      'Протирка фасадов гарнитура снаружи по всей высоте',
      'Очистка варочной панели и ручек плиты',
      'Протирка микроволновки и вытяжки снаружи',
      'Вынос мусора, замена пакета, дезинфекция ведра',
      'Мытье плинтусов и влажная уборка пола',
    ],
  },
  bathroom: {
    title: '🚿 Санузел и ванная',
    tasks: [
      'Дезинфекция и чистка унитаза/биде со всех сторон',
      'Мытье ванны / душевой кабины и удаление водного камня',
      'Чистка раковины и полировка смесителей до блеска',
      'Полировка зеркал и стеклянных полочек без разводов',
      'Протирка стиральной машины и шкафчиков снаружи',
      'Очистка кафельной плитки в мокрых зонах',
      'Мытье плинтусов, пола и очистка ковриков',
    ],
  },
  rooms: {
    title: '🛏 Жилые комнаты и спальни',
    tasks: [
      'Обеспыливание всех открытых полок, столов и комодов',
      'Протирка подоконников, радиаторов отопления и розеток',
      'Полировка зеркал и стеклянных поверхностей мебели',
      'Аккуратная заправка постели / смена постельного белья',
      'Сухая уборка мебели и ковров пылесосом',
      'Влажная уборка плинтусов и пола',
    ],
  },
  hallway: {
    title: '🚪 Прихожая и коридор',
    tasks: [
      'Обеспыливание входной двери, протирка ручек и замков',
      'Протирка полок для обуви и мебели снаружи',
      'Полировка ростового зеркала без разводов',
      'Влажная уборка зоны входного коврика и пола',
    ],
  },
};

export default function ChecklistsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [completedTasks, setCompletedTasks] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        const active = Array.isArray(data)
          ? data.filter((o: any) => o.status !== 'CANCELLED')
          : [];
        setOrders(active);
        if (active.length > 0 && !selectedOrder) {
          setSelectedOrder(active[0]);
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки заказов:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const toggleTask = (taskKey: string) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [taskKey]: !prev[taskKey],
    }));
  };

  // Динамические допы выбранного заказа
  const getOrderAddonTasks = (order: any): string[] => {
    if (!order) return [];
    const tasks: string[] = [];
    if (order.windowsCount > 0) tasks.push(`Мойка стандартных окон (${order.windowsCount} шт.)`);
    if (order.balconyWindowsCount > 0) tasks.push(`Мойка балконных окон (${order.balconyWindowsCount} шт.)`);
    if (order.showcaseWindowsCount > 0) tasks.push(`Мойка витрин (${order.showcaseWindowsCount} шт.)`);
    if (order.hasOven) tasks.push('Тщательная очистка духовки внутри от жира и нагара');
    if (order.hasFridge || order.hasFridgeFreeze) tasks.push('Мытье холодильника внутри с полочками');
    if (order.hasKitchenClosets) tasks.push('Очистка кухонных шкафчиков внутри');
    if (order.hasMicrowave) tasks.push('Очистка микроволновой печи внутри');
    if (order.hasBalcony) tasks.push('Комплексная уборка балкона / лоджии');
    if (order.hasSteamer) tasks.push('Обработка швов и плитки пароочистителем');
    if (order.drySofa2 || order.drySofa3 || order.drySofaCorner4) tasks.push('Химчистка дивана / мягкой мебели');
    if (order.dryArmchair) tasks.push('Химчистка кресла');
    if (order.hasDishesHours) tasks.push(`Мытье посуды (${order.hasDishesHours} ч)`);
    if (order.hasIroningHours) tasks.push(`Глажка белья (${order.hasIroningHours} ч)`);
    return tasks;
  };

  const addonTasks = selectedOrder ? getOrderAddonTasks(selectedOrder) : [];

  const baseTasksCount = Object.values(BASE_CHECKLIST).reduce((acc, cat) => acc + cat.tasks.length, 0);
  const totalTasksCount = baseTasksCount + addonTasks.length;
  const completedCount = Object.values(completedTasks).filter(Boolean).length;
  const progressPercent = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;

  if (loading) {
    return <div className="p-10 text-center text-slate-500 text-xs">Загрузка чек-листов...</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4">
      {/* Шапка экрана (скрывается при печати) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📋 Чек-листы и стандарты качества</h1>
          <p className="text-xs text-slate-500">
            Пошаговый контроль уборки объекта, допов и печать акта сдачи-приемки
          </p>
        </div>

        {selectedOrder && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              🖨 Печать бланка приемки
            </button>

            <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Готовность:</span>
              <div className="w-28 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-extrabold text-emerald-600">{progressPercent}%</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Список заказов (скрывается при печати) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-xs p-4 space-y-3 h-fit print:hidden">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Активные наряды ({orders.length})
          </span>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {orders.map((order) => {
              const isSelected = selectedOrder?.id === order.id;
              return (
                <div
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    setCompletedTasks({});
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-900">{order.clientName || 'Без имени'}</span>
                    <span className="font-extrabold text-blue-600">{order.orderNumber}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 truncate">
                    📍 {order.addressLine1}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>{order.serviceType}</span>
                    <span>{new Date(order.date).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Чек-лист и печатный бланк справа */}
        <div className="lg:col-span-8 space-y-4 print:col-span-12 print:w-full">
          {selectedOrder ? (
            <>
              {/* Карточка объекта */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs print:border-b-2 print:border-slate-800 print:rounded-none print:shadow-none print:p-0 print:pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="hidden print:block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      BrightHouse Cleaning • Акт сдачи-приемки уборки
                    </div>
                    <h2 className="text-base font-bold text-slate-900">
                      Наряд {selectedOrder.orderNumber}: {selectedOrder.serviceType}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      Клиент: <b>{selectedOrder.clientName}</b> • Тел: <b>{selectedOrder.clientPhone}</b>
                    </p>
                    <p className="text-xs text-slate-600">
                      Адрес: <b>{selectedOrder.addressLine1} {selectedOrder.addressLine2 || ''}</b>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Дата: {new Date(selectedOrder.date).toLocaleDateString('ru-RU')} • Время: {selectedOrder.timeSlot || `${selectedOrder.startTime} — ${selectedOrder.endTime}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm bg-emerald-100 text-emerald-900 font-extrabold px-3 py-1 rounded-lg print:border print:border-emerald-400">
                      Сумма: {selectedOrder.price} zł
                    </span>
                    <div className="text-[11px] text-slate-500 mt-1.5">
                      Бригада: {selectedOrder.assignedCleaners?.map((c: any) => c.name || c.cleaner?.name).join(', ') || 'Назначена'}
                    </div>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 print:bg-white print:border-slate-300">
                    <b>⚠️ Особые указания клиента / ТЗ:</b> {selectedOrder.notes}
                  </div>
                )}
              </div>

              {/* СПЕЦЗАДАЧИ И ДОПЫ ЗАКАЗА */}
              {addonTasks.length > 0 && (
                <div className="bg-amber-50/60 border border-amber-300 rounded-2xl p-5 shadow-xs space-y-3 print:bg-white print:border-slate-300 print:rounded-none">
                  <h3 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                    ⭐ Заказанные дополнительные опции ({addonTasks.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {addonTasks.map((task, idx) => {
                      const taskKey = `addon_${idx}`;
                      const isDone = Boolean(completedTasks[taskKey]);
                      return (
                        <div
                          key={taskKey}
                          onClick={() => toggleTask(taskKey)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2.5 text-xs ${
                            isDone
                              ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                              : 'bg-white border-amber-200 text-slate-800 hover:bg-amber-50'
                          }`}
                        >
                          <span className="text-sm">{isDone ? '✅' : '⬜'}</span>
                          <span>{task}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Базовые зоны уборки */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
                {Object.entries(BASE_CHECKLIST).map(([catKey, category]) => (
                  <div
                    key={catKey}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 print:border-slate-300 print:rounded-none print:p-3"
                  >
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {category.title}
                    </h3>

                    <div className="space-y-1.5">
                      {category.tasks.map((task, idx) => {
                        const taskKey = `${catKey}_${idx}`;
                        const isDone = Boolean(completedTasks[taskKey]);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleTask(taskKey)}
                            className={`p-2 rounded-lg border cursor-pointer transition flex items-start gap-2 text-xs ${
                              isDone
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="text-xs leading-none mt-0.5">{isDone ? '✅' : '⬜'}</span>
                            <span className={isDone ? 'line-through opacity-75' : ''}>{task}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Подписи для печатного акта сдачи-приемки */}
              <div className="hidden print:flex justify-between pt-10 text-xs text-slate-800 border-t border-slate-300 mt-6">
                <div>
                  <div className="font-bold">Исполнитель (Клинер):</div>
                  <div className="mt-8 border-b border-slate-400 w-48"></div>
                  <div className="text-[10px] text-slate-500 mt-1">Подпись / дата</div>
                </div>
                <div>
                  <div className="font-bold">Заказчик (Клиент):</div>
                  <div className="mt-8 border-b border-slate-400 w-48"></div>
                  <div className="text-[10px] text-slate-500 mt-1">Претензий к качеству не имею</div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-2xl">
              Выберите заказ слева для открытия чек-листа
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
