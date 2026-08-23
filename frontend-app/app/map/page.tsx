"use client";
import React, { useEffect, useState, useRef } from 'react';

interface MapPoint {
  id: string | number;
  type: 'order' | 'cleaner';
  title: string;
  subtitle: string;
  address: string;
  lat: number;
  lng: number;
}

export default function MapPage() {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    async function initMapAndData() {
      try {
        const [ordersRes, cleanersRes] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/cleaners'),
        ]);

        const rawOrders = ordersRes.ok ? await ordersRes.json() : [];
        const rawCleaners = cleanersRes.ok ? await cleanersRes.json() : [];

        const orderPoints: MapPoint[] = rawOrders.map((o: any) => ({
          id: o.orderNumber || o.id,
          type: 'order',
          title: `${o.orderNumber} — ${o.clientName}`,
          subtitle: `${o.timeSlot} • ${o.price} zł`,
          address: `${o.addressLine1}${o.addressLine2 ? ', ' + o.addressLine2 : ''}`,
          lat: o.latitude || 52.2297 + (Math.random() - 0.5) * 0.08,
          lng: o.longitude || 21.0122 + (Math.random() - 0.5) * 0.08,
        }));

        const cleanerPoints: MapPoint[] = rawCleaners.map((c: any) => ({
          id: c.id,
          type: 'cleaner',
          title: `🙋‍♀️ ${c.name}`,
          subtitle: `Тел: ${c.phone}`,
          address: `Район: ${c.district}`,
          lat: 52.2297 + (Math.random() - 0.5) * 0.08,
          lng: 21.0122 + (Math.random() - 0.5) * 0.08,
        }));

        const allPoints = [...orderPoints, ...cleanerPoints];
        setPoints(allPoints);

        // Динамический импорт Leaflet для клиента
        if (typeof window !== 'undefined' && mapContainerRef.current && !mapInstanceRef.current) {
          const L = (await import('leaflet')).default;
          
          // Подключение стилей Leaflet
          if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
          }

          const map = L.map(mapContainerRef.current).setView([52.2297, 21.0122], 11);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
          }).addTo(map);

          allPoints.forEach((p) => {
            const marker = L.circleMarker([p.lat, p.lng], {
              radius: p.type === 'order' ? 9 : 7,
              color: p.type === 'order' ? '#2563eb' : '#10b981',
              fillColor: p.type === 'order' ? '#3b82f6' : '#34d399',
              fillOpacity: 0.9,
              weight: 2,
            }).addTo(map);

            marker.bindPopup(`<b>${p.title}</b><br/>${p.subtitle}<br/>📍 ${p.address}`);
            marker.on('click', () => setSelectedPoint(p));
          });

          mapInstanceRef.current = map;
        }
      } catch (err) {
        console.error('Ошибка инициализации карты:', err);
      } finally {
        setLoading(false);
      }
    }

    initMapAndData();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">🗺️ Интерактивная карта</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {loading ? 'Загрузка объектов...' : `Всего точек: ${points.length} (Синие — Заказы, Зеленые — Клинеры)`}
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
        {/* Список объектов слева */}
        <div className="col-span-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col overflow-hidden shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Все объекты</span>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {points.map((p) => (
              <div
                key={`${p.type}-${p.id}`}
                onClick={() => {
                  setSelectedPoint(p);
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([p.lat, p.lng], 13);
                  }
                }}
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

        {/* Интерактивная карта OpenStreetMap справа */}
        <div className="col-span-2 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden relative shadow-inner">
          <div ref={mapContainerRef} className="w-full h-full z-0" />
        </div>
      </div>
    </div>
  );
}
