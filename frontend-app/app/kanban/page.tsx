"use client";
import React, { useState, useEffect } from 'react';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

// Колонки для Канбан-доски
const COLUMNS = [
  { id: 'NEW', title: '📥 Новые', color: 'bg-slate-100', borderColor: 'border-slate-200' },
  { id: 'PROCESSING', title: '⏳ В работе (Общение)', color: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'ASSIGNED', title: '✅ Назначены', color: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  { id: 'COMPLETED', title: '🏆 Завершены', color: 'bg-purple-50', borderColor: 'border-purple-200' },
];

// Твои шаблоны для быстрых ответов
const QUICK_RESPONSES = [
  {
    title: '💰 Прейскурант и условия (Стандарт)',
    text: `Стандарт - лёгкая, освежающая уборка всех открытых поверхностей, до которых можно дотянуться без стремянки\n\nЕсли желаете можем выслать подробный состав :)\n\nПодробные состав:\nВанная комната\n* Моем поверхность стиральной машины, открытые полки, умывальник, душевую кабину, ванну, зеркала, унитаз, дверь, пол, выключатели, розетки.\n\nКухня\n* Моем фасады кухонного гарнитура, фартук, столешницы, плиту, раковину, внутри шкафчика под мусор, (выкидываем мусор), дверь, пол, выключатели, розетки.\n\nКомнаты\n* Моем фасады мебели, протираем или пылесосим мягкую мебель, телевизор, подоконники, батареи, плинтуса, двери, столы и стулья, открытые полки, пол, выключатели, розетки.\n\nКоридор\n* Фасады мебели, открытые полки, зеркало, пол, плинтуса, выключатели, розетки, домофон (прочая техника).\n\nМеняем постельное белье по Вашему желанию.\nЗагружаем посуду в посудомойку.\n\nПодскажите, сколько комнат и санузлов в вашей квартире, а также примерный метраж? Мы сразу рассчитаем точную стоимость и время уборки.`
  },
  {
    title: '🧼 Генеральная уборка',
    text: `Здравствуйте ☺️\nВ генеральную уборку входит уборка всех открытых поверхностей + очистка изнутри холодильника, вытяжки, СВЧ, духовки, посудомойки, стиральной машины, шкафчиков, ящиков, мойка стен, высоковисящих люстр и карнизов, отодвигание мебели для уборки под ней и очистка решётки вентиляции.\n\nЕсли желаете можем выслать подробный состав :)\n\nПодробный состав:\nВанная комната\n+ уборка внутри шкафов\n+ мойка вытяжки\n+ отодвигание мебели для уборки пыли\n+ протираем карнизы, люстры\n+ протираем стены, если на них есть загрязнения\n+ Моем поверхность стиральной машины, открытые полки, умывальник, душевую кабину, ванну, зеркала, унитаз, дверь, пол.\n\nКухня\n+ уборка внутри шкафов\n+ мойка холодильника\n+ мойка духовки\n+ мойка вытяжки\n+ протираем карнизы, люстры\n+ протираем стены, если на них есть загрязнения\n+ Моем фасады кухонного гарнитура, столешницы, плиту, раковину, внутри шкафчика под мусор, дверь, пол.\n\nКомнаты\n+ пылесосим внутри диванов\n+ уборка внутри шкафов\n+ отодвигание мебели для уборки пыли\n+ протираем карнизы, люстры, стены\n+ Моем фасады мебели, пылесосим мягкую мебель, пол\n\nКоридор\n+ пылесосим внутри диванов\n+ уборка внутри шкафов\n+ протираем карнизы, люстры, стены\n+ отодвигание мебели для уборки пыли\n+ Фасады мебели, открытые полки, зеркало, пол.`
  },
  {
    title: '🏗️ После ремонта',
    text: `Уборка строительной пыли и минимальных следов покраски\n\nВлажная и сухая уборка всех поверхностей в комнатах и на кухне (кроме потолков)\nВлажная уборка всех поверхностей в санузле (кроме потолков)\nМойка внутри и снаружи мебели, кухни`
  },
  {
    title: '📍 Запрос адреса и времени',
    text: `Отлично! Записали Вас :)\nДля подтверждения заказа пришлите, пожалуйста, нам Ваши:\n1. Точный адрес\n2. Контактный телефон\n3. Проживают ли домашние питомцы\n4. Доступен ли на месте пылесос`
  },
  {
    title: '💳 Подтверждение бронирования',
    text: `Ваш заказ подтвержден! 🌸\nОплата производится после завершения уборки и проверки качества (наличными, переводом на счёт/BLIK, PayPal, revolut).\n\nСпасибо за заказ и хорошего дня ☺️`
  },
  {
    title: '🛋 Химчистка мебели',
    text: `Здравствуйте! ✨ Мы выполняем профессиональную экстракторную химчистку мебели и ковров.\n\nПришлите, пожалуйста, фото вашей мебели для точной оценки :)`
  }
];

export default function KanbanPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Состояния для модалки заказа
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderDetail | null>(null);

  // Состояние для панели шаблонов
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

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

  // --- ЛОГИКА DRAG & DROP ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('orderId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Обязательно, чтобы разрешить drop
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('orderId');
    
    // Оптимистичное обновление UI (чтобы карточка прыгнула сразу)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

    // Отправка на сервер
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
    } catch (err) {
      console.error('Ошибка при перемещении карточки:', err);
      loadOrders(); // Откат, если ошибка
    }
  };

  // --- ЛОГИКА СОХРАНЕНИЯ (ЕДИНОЕ ОКНО) ---
  const handleSaveOrder = async (savedOrder: OrderDetail) => {
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedOrder),
      });
      setIsModalOpen(false);
      loadOrders(); // Перезагружаем доску
    } catch (e) {
      console.error(e);
      alert('Ошибка при сохранении заказа');
    }
  };

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(`Скопировано: ${title}`);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Загрузка доски...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden max-w-[1600px] mx-auto">
      {/* Шапка Канбана */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📋 Канбан-доска</h1>
          <p className="text-xs text-slate-500">Управление статусами заказов (Drag & Drop)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
            className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1"
          >
            ⚡ Шаблоны ответов
          </button>
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
      </div>

      <div className="flex gap-4 h-full overflow-hidden relative">
        
        {/* Колонки Канбана */}
        <div className="flex gap-4 h-full overflow-x-auto pb-4 flex-1">
          {COLUMNS.map(col => {
            const columnOrders = orders.filter(o => (o.status || 'NEW') === col.id);
            return (
              <div 
                key={col.id} 
                className={`flex-shrink-0 w-80 flex flex-col rounded-2xl border ${col.borderColor} ${col.color}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="px-4 py-3 border-b border-white/40 flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-800">{col.title}</h3>
                  <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
                    {columnOrders.length}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {columnOrders.map(order => (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order.id)}
                      onClick={() => {
                        setEditingOrder(order);
                        setIsModalOpen(true);
                      }}
                      className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-brand-300 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                          {order.orderNumber}
                        </span>
                        <span className="text-[10px] font-extrabold text-emerald-600">
                          {order.price} zł
                        </span>
                      </div>
                      
                      <div className="font-bold text-sm text-slate-900 mb-0.5">
                        {order.clientName || 'Без имени'}
                      </div>
                      <div className="text-[11px] text-slate-500 mb-2 truncate">
                        📍 {order.addressLine1 || 'Адрес не указан'}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                        <div className="text-[10px] font-medium text-slate-500">
                          {new Date(order.date).toLocaleDateString('ru-RU')} • {order.timeSlot?.split('—')[0]?.trim() || order.startTime}
                        </div>
                        {order.assignedCleaners?.length > 0 && (
                          <div className="flex -space-x-1.5">
                            {order.assignedCleaners.map((ac: any, i: number) => (
                              <div key={i} className="w-5 h-5 rounded-full bg-brand-100 border border-white flex items-center justify-center text-[8px] font-bold text-brand-700" title={ac.cleaner?.name}>
                                {ac.cleaner?.name?.charAt(0)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {columnOrders.length === 0 && (
                    <div className="text-center text-slate-400 text-xs py-10 border-2 border-dashed border-slate-200 rounded-xl">
                      Перетащите сюда
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Боковая панель: Шаблоны быстрых ответов */}
        {isTemplatesOpen && (
          <div className="w-80 flex-shrink-0 bg-white border border-slate-200 rounded-2xl shadow-lg flex flex-col h-full overflow-hidden animate-fade-in">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-amber-50">
              <h3 className="font-bold text-sm text-amber-900">⚡ Быстрые ответы</h3>
              <button onClick={() => setIsTemplatesOpen(false)} className="text-amber-700 hover:bg-amber-100 p-1 rounded">✕</button>
            </div>
            
            {copyFeedback && (
              <div className="bg-emerald-500 text-white text-[10px] font-bold text-center py-1.5">
                {copyFeedback}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {QUICK_RESPONSES.map((tmpl, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl hover:border-amber-300 transition group relative">
                  <div className="font-bold text-xs text-slate-800 mb-1">{tmpl.title}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-2">{tmpl.text}</div>
                  <button 
                    onClick={() => copyToClipboard(tmpl.text, tmpl.title)}
                    className="absolute inset-0 w-full h-full bg-white/90 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-bold text-amber-600 rounded-xl backdrop-blur-sm"
                  >
                    Скопировать текст
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Вызов единого окна создания/редактирования */}
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
