"use client";
import React, { useEffect, useState } from 'react';

interface MapPoint {
  id: string | number;
  type: 'order' | 'cleaner';
  title: string;
  subtitle: string;
  address: string;
  status?: string;
  lat: number;
  lng: number;
}

// Координаты районов по умолчанию (центр, правый и левый берега)
const districtCoords: Record<string, { lat: number; lng: number }> = {
  'Mokotów': { lat: 52.1936, lng: 21.0305 },
  'Wola': { lat: 52.2366, lng: 20.9540 },
  'Praga': { lat: 52.2530, lng: 21.0360 },
  'Śródmieście': { lat: 52.2319, lng: 21.0067 },
  'Ursynów': { lat: 52.1415, lng: 21.0336 },
  'Bielany': { lat: 52.2858, lng: 20.9328 },
  'Białołęka': { lat: 52.3210, lng: 20.9900 },
};

export default function MapPage() {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ordersRes, cleanersRes] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/cleaners'),
        ]);

        const orderPoints: MapPoint[] = [];
        const cleanerPoints: MapPoint[] = [];

        if (ordersRes.ok) {
          const orders = await ordersRes.json();
          orders.forEach((o: any, idx: number) => {
            // Геопозиция заказа (или дефолтное смещение для наглядности)
            const base = districtCoords['Śródmieście'];
            const lat = o.latitude || base.lat + (Math.random() - 0.5) * 0.05;
            const lng = o.longitude || base.lng + (Math.random() - 0.5) * 0.05;
            
            orderPoints.push({
              id: o.orderNumber || o.id,
              type: 'order',
              title: `${o.orderNumber} — ${o.clientName}`,
              subtitle: `${o.timeSlot} • ${o.price} zł`,
              address: `${o.addressLine1}${o.addressLine2 ? ', ' + o.addressLine2 : ''}`,
              status: o.status,
              lat,
              lng,
            });
          });
        }

        if (cleanersRes.ok) {
          const cleaners = await cleanersRes.json();
          cleaners.forEach((c: any) => {
            const base = districtCoords[c.district] || districtCoords['Śródmieście'];
            const lat = base.lat + (Math.random() - 0.5) * 0.02;
            const lng = base.lng + (Math.random() - 0.5) * 0.02;

            cleanerPoints.push({
              id: c.id,
              type: 'cleaner',
              title: `🙋‍♀️ ${c.name}`,
              subtitle: `Район: ${c.district} • ${c.phone}`,
              address: `Базовый район: ${c.district}`,
              lat,
              lng,
            });
          });
        }

        setPoints([...orderPoints, ...cleanerPoints]);
      } catch (err) {
        console.error('Ошибка загрузки данных карты:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">🗺️ Карта заказов и клинеров</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {loading ? 'Загрузка координат...' : `Всего объектов: ${points.length} (Заказов: ${points.filter(p => p.type === 'order').length}, Клинеров: ${points.filter(p => p.type === 'cleaner').length})`}
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
        {/* Список объектов слева */}
        <div className="col-span-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col overflow-hidden shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Список локаций</span>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {points.map((p) => (
              <div
                key={`${p.type}-${p.id}`}
                onClick={() => setSelectedPoint(p)}
                className={`p-3 rounded-xl border cursor-pointer transition flex flex-col gap-1 ${
                  selectedPoint?.id === p.id && selectedPoint?.type === p.type
                    ? 'border-brand-500 bg-brand-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{p.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    p.type === 'order' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {p.type === 'order' ? 'Заказ' : 'Клинер'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">{p.subtitle}</div>
                <div className="text-[11px] text-slate-600 truncate">📍 {p.address}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Интерактивная зона с картой / карточкой справа */}
        <div className="col-span-2 bg-slate-100 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
          {selectedPoint ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-lg max-w-md z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-slate-400">ID: {selectedPoint.id}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  selectedPoint.type === 'order' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedPoint.type === 'order' ? 'Заказ' : 'Клинер'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">{selectedPoint.title}</h3>
              <p className="text-xs text-slate-500 mb-3">{selectedPoint.subtitle}</p>
              
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs space-y-1 mb-4">
                <div className="font-medium text-slate-700">📍 {selectedPoint.address}</div>
                <div className="text-slate-400 font-mono text-[10px]">Координаты: {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}</div>
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPoint.address)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-block text-center bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-2.5 rounded-lg transition shadow-sm"
              >
                🗺️ Открыть маршрут в Google Maps
              </a>
            </div>
          ) : (
            <div className="m-auto text-center text-slate-400">
              <div className="text-4xl mb-2">📍</div>
              <div className="text-sm font-semibold text-slate-600">Выберите заказ или клинера из списка слева</div>
              <div className="text-xs text-slate-400 mt-1">Здесь отобразятся детали маршрута и навигация</div>
            </div>
          )}

          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm border border-slate-200 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 shadow-sm">
            📡 Сервис геораспределения активен
          </div>
        </div>
      </div>
    </div>
  );
}
