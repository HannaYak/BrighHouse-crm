import React, { useState, useEffect } from 'react';

// Демо-справочник клинеров с их ограничениями (для симуляции фильтра)
const cleanersDatabase = [
  { id: 101, name: 'Мария Сидорова (⭐ Любимчик)', tags: ['аллергия_на_кошек'], incompatibleIds: [103] },
  { id: 102, name: 'Анна Ковальчук', tags: [], incompatibleIds: [] },
  { id: 103, name: 'Светлана Петрова', tags: ['только_поддерживающая'], incompatibleIds: [101] },
  { id: 104, name: 'Екатерина Дмитриева', tags: ['аллергия_на_животных'], incompatibleIds: [] }
];

// Клиент с его черным списком (Светлана Петрова заблокирована)
const currentClient = {
  id: 501,
  name: 'Алина Полякова',
  blacklistIds: [103], // Светлану нанимать нельзя!
  favoriteIds: [101]  // Мария — любимчик
};

const servicesDict = [
  { id: '1', name: 'Поддерживающая (1-2 ком)', baseTimeMinutes: 180, price: 250, type: 'maintenance' },
  { id: '2', name: 'Поддерживающая (3-4 ком)', baseTimeMinutes: 240, price: 350, type: 'maintenance' },
  { id: '3', name: 'Генеральная (1-2 ком)', baseTimeMinutes: 360, price: 500, type: 'general' },
  { id: '4', name: 'После ремонта (1-2 ком)', baseTimeMinutes: 480, price: 700, type: 'post_construction' }
];

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderData: any) => void;
  initialData?: any;
}

export default function OrderModal({ isOpen, onClose, onSave, initialData }: OrderModalProps) {
  if (!isOpen) return null;

  const [clientName, setClientName] = useState(initialData?.clientName || currentClient.name);
  const [phone, setPhone] = useState(initialData?.phone || '+48 123 456 789');
  const [address, setAddress] = useState(initialData?.address || '');
  
  const [selectedServiceId, setSelectedServiceId] = useState(servicesDict[0].id);
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(initialData?.startTime || '10:00');
  const [endTime, setEndTime] = useState('13:00');
  const [price, setPrice] = useState(servicesDict[0].price);

  const [needsVacuum, setNeedsVacuum] = useState(initialData?.needsVacuum || false);
  const [hasPets, setHasPets] = useState(initialData?.hasPets || false);
  const [keysAction, setKeysAction] = useState(initialData?.keysAction || '');
  const [instructions, setInstructions] = useState(initialData?.instructions || '');

  // Выбранные клинеры
  const [cleaner1Id, setCleaner1Id] = useState<number | 'none'>('none');
  const [cleaner2Id, setCleaner2Id] = useState<number | 'none'>('none');

  // Списки клинеров, доступных для выбора (после фильтрации)
  const [filteredCleaners1, setFilteredCleaners1] = useState(cleanersDatabase);
  const [filteredCleaners2, setFilteredCleaners2] = useState(cleanersDatabase);

  // 1. Эффект для автоматического пересчета времени окончания
  useEffect(() => {
    const service = servicesDict.find(s => s.id === selectedServiceId);
    if (!service) return;

    const activeCleanersCount = [cleaner1Id, cleaner2Id].filter(id => id !== 'none').length || 1;
    const rawDuration = service.baseTimeMinutes / activeCleanersCount;
    const durationMinutesOnSite = Math.ceil(rawDuration / 30) * 30;

    const [hours, minutes] = startTime.split(':').map(Number);
    const startObj = new Date();
    startObj.setHours(hours, minutes, 0, 0);
    const endObj = new Date(startObj.getTime() + durationMinutesOnSite * 60 * 1000);
    
    setEndTime(`${String(endObj.getHours()).padStart(2, '0')}:${String(endObj.getMinutes()).padStart(2, '0')}`);
    setPrice(service.price);
  }, [selectedServiceId, cleaner1Id, cleaner2Id, startTime]);

  // 2. Эффект умной фильтрации клинеров (Наш ИИ-помощник)
  useEffect(() => {
    const service = servicesDict.find(s => s.id === selectedServiceId);
    const serviceType = service ? service.type : 'maintenance';

    // Функция-фильтр
    const runFilter = (alreadySelectedId: number | 'none') => {
      return cleanersDatabase.filter(cleaner => {
        // Проверка черного списка клиента
        if (currentClient.blacklistIds.includes(cleaner.id)) return false;

        // Ограничение по типу уборки (без генералок)
        if ((serviceType === 'general' || serviceType === 'post_construction') && cleaner.tags.includes('только_поддерживающая')) {
          return false;
        }

        // Аллергия на животных
        if (hasPets && cleaner.tags.includes('allergy_to_pets')) {
          return false;
        }

        // Несовместимость напарников
        if (alreadySelectedId !== 'none') {
          const selectedCleaner = cleanersDatabase.find(c => c.id === alreadySelectedId);
          if (selectedCleaner?.incompatibleIds.includes(cleaner.id)) return false;
          if (cleaner.incompatibleIds.includes(Number(alreadySelectedId))) return false;
        }

        return true;
      });
    };

    // Обновляем списки доступных сотрудников на лету
    setFilteredCleaners1(runFilter(cleaner2Id));
    setFilteredCleaners2(runFilter(cleaner1Id));

  }, [selectedServiceId, hasPets, cleaner1Id, cleaner2Id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      clientName,
      address,
      startTime,
      endTime,
      cleaners: [cleaner1Id, cleaner2Id].filter(id => id !== 'none')
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 font-sans">
        
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">🛡️ Назначение заказа с Умным Фильтром</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto text-sm text-slate-700">
          
          {/* Клиент */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Имя Клиента</label>
              <input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Адрес уборки</label>
              <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="ул. Коперника 14" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Тип уборки</label>
              <select value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg">
                {servicesDict.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Старт</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">🏁 Финиш (Авто)</label>
              <div className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg">{endTime}</div>
            </div>
          </div>

          {/* Параметры */}
          <div className="flex space-x-4 bg-amber-50/40 p-3 rounded-lg border border-amber-100">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={hasPets} onChange={(e) => setHasPets(e.target.checked)} className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-medium text-slate-700">🐾 Дома есть животные (Включить проверку аллергии)</span>
            </label>
          </div>

          {/* Умный подбор персонала */}
          <div className="border border-indigo-100 bg-indigo-50/20 p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">👩‍💼 Назначение исполнителей (Система защиты от накладок)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Клинер №1</label>
                <select 
                  value={cleaner1Id} 
                  onChange={(e) => setCleaner1Id(e.target.value === 'none' ? 'none' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="none">-- Выберите клинера --</option>
                  {filteredCleaners1.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Клинер №2 (Опционально)</label>
                <select 
                  value={cleaner2Id} 
                  disabled={cleaner1Id === 'none'}
                  onChange={(e) => setCleaner2Id(e.target.value === 'none' ? 'none' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="none">-- Выберите клинера --</option>
                  {filteredCleaners2.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[10px] text-indigo-600/80">💡 База клиентов заблокировала "Светлану П.". Она автоматически скрыта из выпадающих списков.</p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium">Отмена</button>
            <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition">Сохранить</button>
          </div>

        </form>
      </div>
    </div>
  );
}
