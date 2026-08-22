"use client";
import React, { useState } from 'react';

interface MapOrder {
  id: string;
  time: string;
  client: string;
  address: string;
  price: number;
  cleaner: string;
  coords: { x: number; y: number }; // Процентное смещение для визуальной карты
  status: 'assigned' | 'unassigned';
}

interface MapCleaner {
  id: string;
  name: string;
  baseDistrict: string;
  coords: { x: number; y: number };
}

const mockOrders: MapOrder[] = [
  {
    id: 'ORD-101',
    time: '10:00 — 14:00',
    client: 'Алина Полякова',
    address: 'ул. Коперника 14',
    price: 250,
    cleaner: 'Мария Сидорова',
    coords: { x: 45, y: 35 },
    status: 'assigned',
  },
  {
    id: 'ORD-102',
    time: '12:00 — 18:00',
    client: 'Ян Ковальский',
    address: 'al. Jerozolimskie 85',
    price: 450,
    cleaner: 'Анна Ковальчук',
    coords: { x: 60, y: 55 },
    status: 'assigned',
  },
  {
    id: 'ORD-103',
    time: '15:00 — 18:30',
    client: 'Ольга Новак',
    address: 'ul. Marszałkowska 10',
    price: 200,
    cleaner: '',
    coords: { x: 30, y: 70 },
    status: 'unassigned',
  },
];

const mockCleaners: MapCleaner[] = [
  { id: '1', name: 'Мария Сидорова', baseDistrict: 'Mokotów', coords: { x: 48, y: 40 } },
  { id: '2', name: 'Анна Ковальчук', baseDistrict: 'Wola', coords: { x: 63, y: 50 } },
];

export default function DayMapPage() {
  const [selectedDate, setSelectedDate] = useState('2026-07-17');
  const [activeOrderId, setActiveOrderId] = useState<string | null>('ORD-101');

  const activeOrder = mockOrders.find((o) => o.id === activeOrderId);

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-4">
      {/* Панель управления датой */}
      <div className="flex items-center justify-between bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-800">🗺️ Логистика и Маршруты</span>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span>Дата:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-brand-600" />
            <span className="text-slate-600">Заказ назначен</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-slate-600">Поиск клинера</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-600">Клинер (База)</span>
          </div>
        </div>
      </div>

      {/* Рабочая область: Карта + Боковая панель */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Интерактивная карта (70%) */}
        <div className="flex-1 bg-slate-200/60 border border-slate-200 rounded-2xl relative overflow-hidden flex items-center justify-center shadow-inner">
          
          {/* Сетка карты */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Метки клинеров (Дом / Локация) */}
          {mockCleaners.map((cleaner) => (
            <div
              key={cleaner.id}
              style={{ left: `${cleaner.coords.x}%`, top: `${cleaner.coords.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-white/95 border border-emerald-500 shadow-md px-2 py-1 rounded-full text-[10px] font-bold text-slate-800 z-10"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>🙋‍♀️ {cleaner.name}</span>
            </div>
          ))}

          {/* Метки заказов */}
          {mockOrders.map((order) => {
            const isSelected = order.id === activeOrderId;
            return (
              <button
                type="button"
                key={order.id}
                onClick={() => setActiveOrderId(order.id)}
                style={{ left: `${order.coords.x}%`, top: `${order.coords.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl p-2 shadow-lg transition transform hover:scale-105 z-20 text-left border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-brand-500 ring-4 ring-brand-500/20'
                    : order.status === 'assigned'
                    ? 'bg-white text-slate-900 border-slate-200'
                    : 'bg-amber-50 text-slate-900 border-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs">📍</span>
                  <div>
                    <div className="text-[11px] font-bold leading-none">{order.time}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {order.price} zł • {order.client}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Боковая панель заказов на день (30%) */}
        <div className="w-80 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                Заказы на график ({mockOrders.length})
              </h3>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-14rem)] pr-1">
              {mockOrders.map((order) => {
                const isSelected = order.id === activeOrderId;
                return (
                  <div
                    key={order.id}
                    onClick={() => setActiveOrderId(order.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-brand-50/60 border-brand-500 shadow-sm'
                        : 'bg-white border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-800">{order.time}</span>
                      <span className="text-xs font-bold text-brand-600">{order.price} zł</span>
                    </div>

                    <div className="font-semibold text-xs text-slate-900 mb-0.5">{order.client}</div>
                    <div className="text-[11px] text-slate-400 truncate mb-2">📍 {order.address}</div>

                    <div className="flex items-center justify-between text-[10px] border-t border-slate-100 pt-2">
                      <span className="text-slate-500">
                        {order.cleaner ? `Клинер: ${order.cleaner}` : '⚠️ Требуется клинер'}
                      </span>
                      <span
                        className={`font-semibold ${
                          order.status === 'assigned' ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {order.status === 'assigned' ? 'Готов' : 'В подборе'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {activeOrder && (
            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2 rounded-lg transition shadow-sm"
              >
                Открыть маршрут в навигаторе
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
