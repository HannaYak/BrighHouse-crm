import React, { useState } from 'react';

// Демо-данные меток для карты на сегодня (Варшава)
const mockMapOrders = [
  { id: 1, client: 'Алина Полякова', time: '10:00', address: 'ул. Коперника 14', lat: 52.233, lng: 21.020, type: 'order' },
  { id: 2, client: 'Ян Ковальский', time: '13:30', address: 'al. Jerozolimskie 85', lat: 52.225, lng: 21.003, type: 'order' }
];

const mockMapCleaners = [
  { id: 101, name: 'Мария Сидорова (Дом)', address: 'Mokotów', lat: 52.200, lng: 21.010, type: 'cleaner' },
  { id: 102, name: 'Анна Ковальчук (Дом)', address: 'Wola', lat: 52.235, lng: 20.970, type: 'cleaner' }
];

export default function DayMapPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="p-6 min-h-screen bg-slate-50 font-sans flex flex-col h-screen">
      {/* Шапка логистики */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🗺️ Интерактивная Карта Дня</h1>
          <p className="text-slate-500 text-sm">Умная визуальная логистика и распределение маршрутов</p>
        </div>
        
        {/* Выбор даты для фильтрации меток */}
        <div className="flex items-center space-x-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">Показать день:</label>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="border-none text-sm font-semibold text-indigo-600 focus:ring-0 cursor-pointer"
          />
        </div>
      </header>

      {/* Основная рабочая зона: Карта + Панель информации */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 h-[calc(100vh-160px)]">
        
        {/* Левая панель: Список объектов на выбранный день */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-4 overflow-y-auto">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">📍 Заказы в графике ({mockMapOrders.length})</h3>
            <div className="space-y-2">
              {mockMapOrders.map(order => (
                <div key={order.id} className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl hover:border-blue-300 transition cursor-pointer">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">⏰ {order.time}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">{order.client}</h4>
                  <p className="text-xs text-slate-500 truncate">{order.address}</p>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">🙋‍♀️ Клинеры поблизости ({mockMapCleaners.length})</h3>
            <div className="space-y-2">
              {mockMapCleaners.map(cleaner => (
                <div key={cleaner.id} className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                    {cleaner.name}
                  </h4>
                  <p className="text-xs text-slate-500">База: Район {cleaner.address}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Правая зона: Интерактивная Карта */}
        <div className="lg:grid-cols-1 lg:col-span-3 bg-slate-200 rounded-2xl border border-slate-300 shadow-inner relative overflow-hidden flex items-center justify-center">
          
          {/* Симуляция карты (так как полноценный скрипт карты инициализируется в браузере) */}
          <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center p-8 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]">
            
            {/* Пример отображения меток на экране для наглядности ТЗ */}
            <div className="absolute top-[40%] left-[50%] bg-blue-600 text-white font-bold text-xs py-1 px-2.5 rounded-full shadow-lg flex items-center space-x-1 border-2 border-white animate-bounce">
              <span>📍 10:00 Алина П.</span>
            </div>

            <div className="absolute top-[55%] left-[45%] bg-blue-600 text-white font-bold text-xs py-1 px-2.5 rounded-full shadow-lg flex items-center space-x-1 border-2 border-white">
              <span>📍 13:30 Ян К.</span>
            </div>

            <div className="absolute top-[30%] left-[35%] bg-emerald-600 text-white font-bold text-xs py-1 px-2.5 rounded-full shadow-lg flex items-center space-x-1 border-2 border-white">
              <span>🏠 Аня (Wola)</span>
            </div>

            <div className="absolute top-[65%] left-[55%] bg-emerald-600 text-white font-bold text-xs py-1 px-2.5 rounded-full shadow-lg flex items-center space-x-1 border-2 border-white">
              <span>🏠 Маша (Mokotów)</span>
            </div>

            <div className="text-center max-w-sm pointer-events-none bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-semibold text-slate-700">🗺️ Карта дня Leaflet/Mapbox</p>
              <p className="text-xs text-slate-500 mt-1">Компонент выводит гео-координаты `lat` и `lng` из базы данных. Менеджер визуально видит кратчайшие маршруты для Маши и Ани.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
