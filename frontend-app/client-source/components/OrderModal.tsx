import React, { useState, useEffect } from 'react';

// Тестовый справочник услуг с базовым временем (из Спринта 2)
const servicesDict = [
  { id: '1', name: 'Поддерживающая (1-2 ком)', baseTimeMinutes: 180, price: 250 },
  { id: '2', name: 'Поддерживающая (3-4 ком)', baseTimeMinutes: 240, price: 350 },
  { id: '3', name: 'Генеральная (1-2 ком)', baseTimeMinutes: 360, price: 500 },
  { id: '4', name: 'После ремонта (1-2 ком)', baseTimeMinutes: 480, price: 700 },
  { id: '5', name: 'Мытье окон (доп. услуга)', baseTimeMinutes: 60, price: 100 }
];

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderData: any) => void;
  initialData?: any;
}

export default function OrderModal({ isOpen, onClose, onSave, initialData }: OrderModalProps) {
  if (!isOpen) return null;

  const [clientName, setClientName] = useState(initialData?.clientName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [address, setAddress] = useState(initialData?.address || '');
  
  // Выбор услуги и количества клинеров
  const [selectedServiceId, setSelectedServiceId] = useState(servicesDict[0].id);
  const [cleanersCount, setCleanersCount] = useState(1);
  
  // Время старта и рассчитанное время окончания
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(initialData?.startTime || '10:00');
  const [endTime, setEndTime] = useState('13:00');
  const [price, setPrice] = useState(servicesDict[0].price);

  // Теги-чекбоксы
  const [needsVacuum, setNeedsVacuum] = useState(initialData?.needsVacuum || false);
  const [hasPets, setHasPets] = useState(initialData?.hasPets || false);
  const [keysAction, setKeysAction] = useState(initialData?.keysAction || '');
  const [instructions, setInstructions] = useState(initialData?.instructions || '');

  // Эффект авторасчёта времени при изменении услуги или количества клинеров
  useEffect(() => {
    const service = servicesDict.find(s => s.id === selectedServiceId);
    if (!service) return;

    // 1. Формула: Базовое время / Кол-во клинеров
    const rawDuration = service.baseTimeMinutes / cleanersCount;
    
    // 2. Округление вверх до 30 минут ("коэффициент толпы")
    const durationMinutesOnSite = Math.ceil(rawDuration / 30) * 30;

    // 3. Считаем время окончания
    const [hours, minutes] = startTime.split(':').map(Number);
    const startObj = new Date();
    startObj.setHours(hours, minutes, 0, 0);
    
    const endObj = new Date(startObj.getTime() + durationMinutesOnSite * 60 * 1000);
    
    // Форматируем результат обратно в строку HH:MM
    const endHours = String(endObj.getHours()).padStart(2, '0');
    const endMinutes = String(endObj.getMinutes()).padStart(2, '0');
    
    setEndTime(`${endHours}:${endMinutes}`);
    
    // Авто-подстановка цены (базовая цена * коэффициент ручной корректировки, если нужно)
    setPrice(service.price);
  }, [selectedServiceId, cleanersCount, startTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      clientName,
      phone,
      address,
      selectedServiceId,
      cleanersCount,
      price,
      date,
      startTime,
      endTime,
      needsVacuum,
      hasPets,
      keysAction: keysAction || null,
      instructions
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
        
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">✨ Оформление заказа (Автоматика включена)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          
          {/* Клиент */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Имя Клиента</label>
              <input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Алина Полякова" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Телефон</label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="+48 123 456 789" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Адрес уборки</label>
            <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="ул. Коперника 14, Варшава" />
          </div>

          {/* Услуги и Калькуляция */}
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">Тип уборки (Справочник)</label>
              <select 
                value={selectedServiceId} 
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {servicesDict.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.baseTimeMinutes / 60}ч)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">Количество клинеров</label>
              <input 
                type="number" min="1" max="4" 
                value={cleanersCount} 
                onChange={(e) => setCleanersCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Результат времени */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Дата</label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Старт</label>
              <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">🏁 Финиш (Авто)</label>
              <div className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-bold text-indigo-700">
                {endTime}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Итого (PLN)</label>
              <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-emerald-600" />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Доп. опции */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={needsVacuum} onChange={(e) => setNeedsVacuum(e.target.checked)} className="w-4 h-4 text-indigo-600 border-slate-300 rounded" />
              <span>🔌 Нужен наш пылесос</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={hasPets} onChange={(e) => setHasPets(e.target.checked)} className="w-4 h-4 text-indigo-600 border-slate-300 rounded" />
              <span>🐾 Есть животные</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">🔐 Передача ключей</label>
            <input type="text" value={keysAction} onChange={(e) => setKeysAction(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Например: 'оставить под ковриком'" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">📋 Комментарий / ТЗ</label>
            <textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Особые пожелания..." />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Отмена</button>
            <button type="submit" className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition">Сохранить</button>
          </div>

        </form>
      </div>
    </div>
  );
}
