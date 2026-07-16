import React, { useState } from 'react';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderData: any) => void;
  initialData?: any;
}

export default function OrderModal({ isOpen, onClose, onSave, initialData }: OrderModalProps) {
  if (!isOpen) return null;

  // Локальное состояние для полей формы
  const [clientName, setClientName] = useState(initialData?.clientName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [price, setPrice] = useState(initialData?.price || '');
  const [date, setDate] = useState(initialData?.date || '');
  const [startTime, setStartTime] = useState(initialData?.startTime || '10:00');
  
  // Теги-чекбоксы (наша автоматизация рутины)
  const [needsVacuum, setNeedsVacuum] = useState(initialData?.needsVacuum || false);
  const [hasPets, setHasPets] = useState(initialData?.hasPets || false);
  const [keysAction, setKeysAction] = useState(initialData?.keysAction || '');

  // ТЗ и фото
  const [instructions, setInstructions] = useState(initialData?.instructions || '');
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      clientName,
      phone,
      address,
      price,
      date,
      startTime,
      needsVacuum,
      hasPets,
      keysAction: keysAction || null,
      instructions,
      photos
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
        
        {/* Шапка модального окна */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">
            {initialData ? '📝 Редактировать заказ' : '✨ Новый заказ на уборку'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
            &times;
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Блок 1: Основные данные */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Имя Клиента</label>
              <input 
                type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="Иван Иванов"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Телефон</label>
              <input 
                type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="+48 123 456 789"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Адрес объекта</label>
            <input 
              type="text" required value={address} onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="ул. Коперника 14, кв. 12, Варшава"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Дата</label>
              <input 
                type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Время старта</label>
              <input 
                type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Цена (PLN)</label>
              <input 
                type="number" required value={price} onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="250"
              />
            </div>
          </div>

          <hr className="border-slate-100 my-2" />

          {/* Блок 2: Критические теги (Наш щит от ошибок) */}
          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Важные детали заказа</span>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer select-none">
                <input 
                  type="checkbox" checked={needsVacuum} onChange={(e) => setNeedsVacuum(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <span>🔌 Нужен наш пылесос</span>
              </label>

              <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer select-none">
                <input 
                  type="checkbox" checked={hasPets} onChange={(e) => setHasPets(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <span>🐾 Дома есть животные</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">🔐 Передача ключей</label>
            <input 
              type="text" value={keysAction} onChange={(e) => setKeysAction(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="Например: 'забрать на ресепшене', 'оставить под ковриком'..."
            />
          </div>

          <hr className="border-slate-100 my-2" />

          {/* Блок 3: ТЗ и Фото */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">📋 Техническое задание для клинера</label>
            <textarea 
              rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="Помыть духовку внутри. Особое внимание уделить вытяжке..."
            />
          </div>

          {/* Кнопки */}
          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
            <button 
              type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition"
            >
              Отмена
            </button>
            <button 
              type="submit"
              className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition"
            >
              Сохранить заказ
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
