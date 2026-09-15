"use client";
import React, { useState, useEffect } from 'react';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

export default function DirectoriesPage() {
  const [activeTab, setActiveTab] = useState<'cleaners' | 'clients'>('cleaners');
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Состояние для модалки повторения заказа
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [repeatOrderData, setRepeatOrderData] = useState<OrderDetail | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resCl, resClients] = await Promise.all([
        fetch('/api/cleaners'),
        fetch('/api/clients'),
      ]);
      if (resCl.ok) setCleaners(await resCl.json());
      if (resClients.ok) setClients(await resClients.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const generatePin = async (id: number) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      const res = await fetch('/api/cleaners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, authCode: pin }),
      });
      if (res.ok) {
        setCleaners((prev) =>
          prev.map((c) => (c.id === id ? { ...c, authCode: pin } : c))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Функция для повторения заказа на основе данных клиента
  const handleRepeatOrder = (client: any) => {
    const template: OrderDetail = {
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '13:00',
      serviceType: 'STANDARD',
      areaM2: 50,
      roomsCount: 2,
      bathroomsCount: 1,
      windowsCount: 0,
      showcaseWindowsCount: 0,
      balconyWindowsCount: 0,
      hasOven: false,
      hasFridge: false,
      hasFridgeFreeze: false,
      hasMicrowave: false,
      hasBalcony: false,
      hasKitchenClosets: false,
      hasStairs: false,
      hasSteamer: false,
      hasDishesHours: 0,
      hasIroningHours: 0,
      hasVacuum: false,
      hasPets: false,
      hasKeys: false,
      drySofa2: 0,
      drySofa3: 0,
      drySofaCorner4: 0,
      dryArmchair: 0,
      dryMattressSide: 0,
      clientName: client.name || '',
      clientPhone: client.phone || '',
      addressLine1: client.address || '',
      addressLine2: '',
      price: 200,
      cleanersCount: 1,
      assignedCleaners: [],
      notes: client.notes ? `Повтор заказа. Заметки: ${client.notes}` : 'Повторный заказ',
      paymentMethod: 'CASH',
      cashCollectedById: null,
    };
    setRepeatOrderData(template);
    setIsModalOpen(true);
  };

  const handleSaveOrder = async (savedOrder: OrderDetail) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedOrder),
      });
      if (res.ok) {
        setIsModalOpen(false);
        alert('✅ Повторный заказ успешно создан и отправлен в работу!');
        loadData();
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка при создании заказа');
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Справочники системы</h1>
          <p className="text-xs text-slate-500">Управление персоналом и клиентской базой</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('cleaners')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'cleaners'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🙋‍♀️ Клинеры ({cleaners.length})
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'clients'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👥 Клиенты ({clients.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs font-semibold">Загрузка данных...</div>
      ) : activeTab === 'cleaners' ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Сотрудник</th>
                <th className="p-3.5">Телефон / Telegram</th>
                <th className="p-3.5">Район</th>
                <th className="p-3.5">Теги и Допуски</th>
                <th className="p-3.5">Смена</th>
                <th className="p-3.5">Telegram Бот</th>
                <th className="p-3.5">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cleaners.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-3.5 font-bold text-slate-900">{c.name}</td>
                  <td className="p-3.5">
                    <div>{c.phone}</div>
                    <div className="text-brand-600 font-semibold">{c.telegramHandle || '—'}</div>
                  </td>
                  <td className="p-3.5 font-medium text-slate-600">📍 {c.district}</td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1">
                      {c.tags?.map((t: string) => (
                        <span key={t} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-slate-700 font-semibold">09:00 — 19:00</td>
                  <td className="p-3.5">
                    {c.telegramChatId ? (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                        ✅ Подключен
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-semibold">
                        ⏳ Ожидает PIN
                      </span>
                    )}
                  </td>
                  <td className="p-3.5">
                    {c.authCode ? (
                      <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded font-mono font-bold text-xs">
                        PIN: {c.authCode}
                      </span>
                    ) : (
                      <button
                        onClick={() => generatePin(c.id)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-lg text-xs font-semibold transition"
                      >
                        Сгенерировать PIN
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Клиент</th>
                <th className="p-3.5">Основной адрес</th>
                <th className="p-3.5">Особенности / ТЗ</th>
                <th className="p-3.5 text-center">Всего заказов</th>
                <th className="p-3.5 text-right">LTV (Принес денег)</th>
                <th className="p-3.5 text-center">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    База клиентов пока пуста. Они появятся здесь автоматически при сохранении новых заказов.
                  </td>
                </tr>
              ) : (
                clients.map((cl) => (
                  <tr key={cl.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{cl.name}</div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">{cl.phone}</div>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {cl.address ? `📍 ${cl.address}` : '—'}
                    </td>
                    <td className="p-3.5">
                      {cl.notes ? (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg text-[11px] font-medium">
                          📝 {cl.notes}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-extrabold text-slate-700">
                      {cl.ordersCount}
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-600">
                      {cl.ltv?.toFixed(0)} zł
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleRepeatOrder(cl)}
                        className="bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold px-3 py-1.5 rounded-xl transition text-[11px] shadow-2xs"
                      >
                        🔁 Повторить заказ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Модалка для создания повторного заказа */}
      {isModalOpen && (
        <OrderModal
          order={repeatOrderData}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveOrder}
        />
      )}
    </div>
  );
}
