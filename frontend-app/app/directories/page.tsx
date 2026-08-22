"use client";
import React, { useState } from 'react';

interface CleanerItem {
  id: number;
  name: string;
  phone: string;
  district: string;
  tags: string[];
  status: 'active' | 'inactive';
}

interface ClientItem {
  id: number;
  name: string;
  phone: string;
  address: string;
  favoriteCleaner: string;
  blacklistCleaner: string;
}

interface ServiceItem {
  id: number;
  title: string;
  baseManHours: number;
  basePrice: number;
}

const initialCleaners: CleanerItem[] = [
  { id: 1, name: 'Мария Сидорова', phone: '+48 555 111 222', district: 'Mokotów', tags: ['аллергия_на_кошек', 'только_поддерживающая'], status: 'active' },
  { id: 2, name: 'Анна Ковальчук', phone: '+48 555 333 444', district: 'Wola', tags: ['опыт_генералок', 'без_высоты'], status: 'active' },
  { id: 3, name: 'Елена Демченко', phone: '+48 555 777 888', district: 'Praga', tags: ['химчистка', 'окна'], status: 'active' },
];

const initialClients: ClientItem[] = [
  { id: 1, name: 'Алина Полякова', phone: '+48 123 456 789', address: 'ул. Коперника 14', favoriteCleaner: 'Мария Сидорова', blacklistCleaner: 'Светлана П.' },
  { id: 2, name: 'Ян Ковальский', phone: '+48 987 654 321', address: 'al. Jerozolimskie 85', favoriteCleaner: 'Анна Ковальчук', blacklistCleaner: '—' },
];

const initialServices: ServiceItem[] = [
  { id: 1, title: 'Поддерживающая уборка', baseManHours: 3.5, basePrice: 180 },
  { id: 2, title: 'Генеральная уборка', baseManHours: 6.0, basePrice: 350 },
  { id: 3, title: 'Уборка после ремонта', baseManHours: 8.0, basePrice: 500 },
];

export default function DirectoriesPage() {
  const [activeTab, setActiveTab] = useState<'cleaners' | 'clients' | 'services'>('cleaners');
  const [cleaners] = useState<CleanerItem[]>(initialCleaners);
  const [clients] = useState<ClientItem[]>(initialClients);
  const [services] = useState<ServiceItem[]>(initialServices);

  return (
    <div className="flex flex-col space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">🗄️ Справочники и Настройки</h1>
        <p className="text-xs text-slate-500 mt-0.5">Управление персоналом, клиентской базой и тарификацией услуг</p>
      </div>

      {/* Переключатель вкладок */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('cleaners')}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 transition ${
            activeTab === 'cleaners'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🙋‍♀️ Клинеры ({cleaners.length})
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 transition ${
            activeTab === 'clients'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          👥 Клиенты ({clients.length})
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 transition ${
            activeTab === 'services'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🧹 Услуги и Тарифы ({services.length})
        </button>
      </div>

      {/* Таблица клинеров */}
      {activeTab === 'cleaners' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Имя</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Телефон</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Район базы</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Теги / Ограничения</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {cleaners.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono">{c.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{c.district}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t, idx) => (
                        <span key={idx} className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                          ⚠️ {t.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                      Активен
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Таблица клиентов */}
      {activeTab === 'clients' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Имя</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Телефон</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Основной адрес</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Любимый клинер</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Чёрный список</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-semibold text-slate-900">{client.name}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono">{client.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{client.address}</td>
                  <td className="px-4 py-3 text-emerald-700 font-medium">💖 {client.favoriteCleaner}</td>
                  <td className="px-4 py-3 text-red-600 font-medium">🚫 {client.blacklistCleaner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Таблица услуг */}
      {activeTab === 'services' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Название услуги</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Базовое время (чел/час)</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">Базовая цена</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-semibold text-slate-900">{service.title}</td>
                  <td className="px-4 py-3 text-slate-600">{service.baseManHours} ч.</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{service.basePrice} zł</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
