"use client";
import React, { useEffect, useState, useRef } from 'react';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

interface MapPoint {
  id: string | number;
  type: 'order' | 'cleaner';
  title: string;
  subtitle: string;
  address: string;
  date?: string;
  lat: number;
  lng: number;
  rawOrder?: any;
}

const districtCoordinates: Record<string, { lat: number; lng: number }> = {
  'Mokotów': { lat: 52.1936, lng: 21.0305 },
  'Wola': { lat: 52.2366, lng: 20.9540 },
  'Praga': { lat: 52.2530, lng: 21.0360 },
  'Śródmieście': { lat: 52.2319, lng: 21.0067 },
  'Центр': { lat: 52.2297, lng: 21.0122 },
  'Ursynów': { lat: 52.1415, lng: 21.0336 },
  'Bielany': { lat: 52.2858, lng: 20.9328 },
  'Białołęka': { lat: 52.3210, lng: 20.9900 },
};

export default function MapDayPage() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [filteredPoints, setFilteredPoints] = useState<MapPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  // 1. Загрузка данных
  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, cleanersRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/cleaners'),
      ]);

      const rawOrders = ordersRes.ok ? await ordersRes.json() : [];
      const rawCleaners = cleanersRes.ok ? await cleanersRes.json() : [];

      setAllOrders(rawOrders);
      setCleaners(rawCleaners);
    } catch (err) {
      console.error('Ошибка загрузки данных карты:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Инициализация карты OpenStreetMap
  useEffect(() => {
    async function initLeaflet() {
      if (typeof window !== 'undefined' && mapContainerRef.current && !mapInstanceRef.current) {
        const L = (await import('leaflet')).default;

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

        markersLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
      }
    }
    initLeaflet();
  }, []);

  // 3. Фильтрация точек по выбранной дате
  useEffect(() => {
    const dayOrders = allOrders.filter((o) => {
      const orderDate = new Date(o.date).toISOString().split('T')[0];
      return orderDate === selectedDate;
    });

    const orderPoints: MapPoint[] = dayOrders.map((o) => {
      const base = districtCoordinates['Центр'];
      const lat = o.latitude || base.lat + (Math.random() - 0.5) * 0.08;
      const lng = o.longitude || base.lng + (Math.random() - 0.5) * 0.08;
      const assigned = o.assignedCleaners?.map((ac: any) => ac.cleaner?.name).join(', ');

      return {
        id: o.id || o.orderNumber,
        type: 'order',
        title: `${o.orderNumber} — ${o.clientName}`,
        subtitle: `⏱️ ${o.timeSlot} • 💰 ${o.price} zł • 👥 ${assigned || 'Не назначен'}`,
        address: `${o.addressLine1}${o.addressLine2 ? ', ' + o.addressLine2 : ''}`,
        date: selectedDate,
        lat,
        lng,
        rawOrder: o,
      };
    });

    const cleanerPoints: MapPoint[] = cleaners.map((c) => {
      const base = districtCoordinates[c.district] || districtCoordinates['Центр'];
      const lat = base.lat + (Math.random() - 0.5) * 0.03;
      const lng = base.lng + (Math.random() - 0.5) * 0.03;

      return {
        id: c.id,
        type: 'cleaner',
        title: `🙋‍♀️ ${c.name}`,
        subtitle: `📍 Район: ${c.district} • ${c.phone}`,
        address: `Базовый район: ${c.district}`,
        lat,
        lng,
      };
    });

    const currentPoints = [...orderPoints, ...cleanerPoints];
    setFilteredPoints(currentPoints);

    // Отрисовка маркеров на карте
    if (mapInstanceRef.current && markersLayerRef.current) {
      import('leaflet').then((LModule) => {
        const L = LModule.default;
        markersLayerRef.current.clearLayers();

        currentPoints.forEach((p) => {
          const marker = L.circleMarker([p.lat, p.lng], {
            radius: p.type === 'order' ? 9 : 7,
            color: p.type === 'order' ? '#2563eb' : '#10b981',
            fillColor: p.type === 'order' ? '#3b82f6' : '#34d399',
            fillOpacity: 0.9,
            weight: 2,
          }).addTo(markersLayerRef.current);

          marker.bindPopup(`<b>${p.title}</b><br/>${p.subtitle}<br/>📍 ${p.address}`);
          marker.on('click', () => setSelectedPoint(p));
        });
      });
    }
  }, [selectedDate, allOrders, cleaners]);

  const handleEditClick = (point: MapPoint) => {
    if (point.type === 'order' && point.rawOrder) {
      const o = point.rawOrder;
      setEditingOrder({
        id: o.id,
        orderNumber: o.orderNumber,
        date: new Date(o.date).toISOString().split('T')[0],
        startTime: o.timeSlot ? o.timeSlot.split(' — ')[0] : '10:00',
        endTime: o.timeSlot ? o.timeSlot.split(' — ')[1] : '14:00',
        timeSlot: o.timeSlot,
        serviceType: o.serviceType || 'STANDARD',
        areaM2: o.areaM2 || 45,
        roomsCount: o.roomsCount || 1,
        bathroomsCount: o.bathroomsCount || 1,
        windowsCount: o.windowsCount || 0,
        hasOven: o.hasOven || false,
        hasFridge: o.hasFridge || false,
        hasFridgeFreeze: o.hasFridgeFreeze || false,
        hasMicrowave: o.hasMicrowave || false,
        hasBalcony: o.hasBalcony || false,
        hasKitchenClosets: o.hasKitchenClosets || false,
        hasStairs: o.hasStairs || false,
        hasSteamer: o.hasSteamer || false,
        hasDishesHours: o.hasDishesHours || 0,
        hasIroningHours: o.hasIroningHours || 0,
        hasVacuum: o.hasVacuum || false,
        hasPets: o.hasPets || false,
        hasKeys: o.hasKeys || false,
        drySofa2: 0,
        drySofa3: 0,
        drySofaCorner4: 0,
        dryArmchair: 0,
        dryMattressSide: 0,
        clientName: o.clientName,
        clientPhone: o.clientPhone,
        addressLine1: o.addressLine1,
        addressLine2: o.addressLine2 || '',
        price: o.price,
        cleanersCount: o.cleanersCount || 1,
        assignedCleaners: o.assignedCleaners?.map((ac: any) => ({
          id: ac.cleaner.id,
          name: ac.cleaner.name,
          phone: ac.cleaner.phone,
        })) || [],
        notes: o.notes || '',
      });
      setIsModalOpen(true);
    }
  };

  const handleSaveOrder = async (saved: OrderDetail) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saved),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error('Ошибка сохранения заказа из карты:', e);
    }
  };

  const orderPointsList = filteredPoints.filter((p) => p.type === 'order');

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3">
      {/* Панель управления и выбор даты */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-slate-800">🗺️ Карта дня (Визуальная логистика)</h1>
          <span className="text-xs text-slate-400">|</span>
          <span className="text-xs font-semibold text-slate-600">
            Заказов на дату: <b className="text-brand-600 font-extrabold">{orderPointsList.length}</b>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Дата:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 shadow-inner"
          />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
        {/* Список заказов на день слева */}
        <div className="col-span-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Заказы на {selectedDate}
            </span>
            <span className="text-[11px] font-bold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full">
              {orderPointsList.length} шт
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {orderPointsList.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                Нет запланированных заказов на эту дату
              </div>
            ) : (
              orderPointsList.map((p) => (
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
                      ? 'border-brand-500 bg-brand-50/60 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{p.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                      Заказ
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">{p.subtitle}</div>
                  <div className="text-[11px] text-slate-600 truncate">📍 {p.address}</div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(p);
                    }}
                    className="mt-1.5 text-center bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold py-1 rounded text-[11px] transition shadow-2xs"
                  >
                    ✏️ Назначить / Изменить
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Интерактивная карта OpenStreetMap справа */}
        <div className="col-span-2 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden relative shadow-inner">
          <div ref={mapContainerRef} className="w-full h-full z-0" />
        </div>
      </div>

      <OrderModal
        order={editingOrder}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveOrder}
      />
    </div>
  );
}
