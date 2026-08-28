"use client";
import React, { useState, useEffect } from 'react';

// Стандартные зоны и этапы чек-листа
const BASE_CHECKLIST = {
  kitchen: {
    title: '🍳 Кухня',
    tasks: [
      'Мытье раковины, смесителя и удаление налета',
      'Очистка рабочей столешницы и фартука',
      'Протирка фасадов кухонного гарнитура снаружи',
      'Мытье плиты / варочной панели',
      'Протирка микроволновки и вытяжки снаружи',
      'Вынос мусора и замена мусорного пакета',
      'Мытье плинтусов и влажная уборка пола',
    ]
  },
  bathroom: {
    title: '🚿 Санузел',
    tasks: [
      'Дезинфекция и чистка унитаза/биде со всех сторон',
      'Мытье ванны / душевой кабины и удаление водного камня',
      'Чистка раковины и полировка хромированных смесителей',
      'Полировка зеркал и стеклянных полочек без разводов',
      'Протирка шкафчиков и стиральной машины снаружи',
      'Мытье плитки вокруг мокрых зон',
      'Влажная уборка пола и мытье ковриков',
    ]
  },
  rooms: {
    title: '🛏 Комнаты и спальни',
    tasks: [
      'Обеспыливание всех открытых горизонтальных поверхностей',
      'Протирка подоконников, радиаторов и розеток/выключателей',
      'Полировка зеркал и стеклянных элементов мебели',
      'Аккуратная заправка постели / смена белья (при наличии)',
      'Сухая уборка пылесосом мебели и ковровых покрытий',
      'Мытье плинтусов и влажная уборка полов',
    ]
  },
  hallway: {
    title: '🚪 Коридор и прихожая',
    tasks: [
      'Обеспыливание входной двери и ручек',
      'Протирка полок для обуви и шкафа снаружи',
      'Полировка ростового зеркала',
      'Влажная уборка зоны входного коврика и пола',
    ]
  }
};

export default function ChecklistsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [completedTasks, setCompletedTasks] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/checklists');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        if (data.length > 0 && !selectedOrder) {
          setSelectedOrder(data[0]);
        }
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

  const toggleTask = (taskKey: string) => {
    setCompletedTasks(prev => ({
      ...prev,
      [taskKey]: !prev[taskKey]
    }));
  };

  // Расчет прогресса выполнения
  const allTasksCount = Object.values(BASE_CHECKLIST).reduce((acc, cat) => acc + cat.tasks.length, 0);
  const completedCount = Object.values(completedTasks).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / allTasksCount) * 100);

  if (loading) return <div className="p-10 text-center text-slate-500 text-xs">Загрузка чек-листов...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📋 Чек-листы стандартов уборки</h1>
          <p className="text-xs text-slate-500">Пошаговый контроль качества выполнения работ клинерами по зонам</p>
        </div>

        {selectedOrder && (
          <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700">Прогресс проверки:</span>
            <div className="w-32 bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-extrabold text-emerald-600">{progressPercent}%</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Список заказов слева */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3 h-fit">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Выберите заказ для контроля
          </span>

          <div className="space-y-2">
            {orders.map(order => {
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
                      ? 'bg-brand-50 border-brand-500 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-900">{order.clientName || 'Заказ'}</span>
                    <span className="font-extrabold text-brand-600">{order.orderNumber}</span>
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

        {/* Чек-лист справа */}
        <div className="lg:col-span-8 space-y-4">
          {selectedOrder ? (
            <>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Чек-лист наряда {selectedOrder.orderNumber}: {selectedOrder.serviceType}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Клиент: <b>{selectedOrder.clientName}</b> • Адрес: {selectedOrder.addressLine1}
                    </p>
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg">
                    {selectedOrder.price} zł
                  </span>
                </div>

                {/* Особые примечания к заказу */}
                {selectedOrder.notes && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    <b>⚠️ Дополнительные пожелания и допы:</b> {selectedOrder.notes}
                  </div>
                )}
              </div>

              {/* Зоны уборки */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(BASE_CHECKLIST).map(([catKey, category]) => (
                  <div key={catKey} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {category.title}
                    </h3>

                    <div className="space-y-2">
                      {category.tasks.map((task, idx) => {
                        const taskKey = `${catKey}_${idx}`;
                        const isDone = Boolean(completedTasks[taskKey]);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleTask(taskKey)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 text-xs ${
                              isDone
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="text-sm leading-none mt-0.5">
                              {isDone ? '✅' : '⬜'}
                            </span>
                            <span className={isDone ? 'line-through opacity-80' : ''}>{task}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
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
