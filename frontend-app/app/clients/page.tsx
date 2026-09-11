"use client";
import React, { useState, useEffect } from 'react';
import OrderModal, { OrderDetail } from '@/components/OrderModal';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [cleanersList, setCleanersList] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  const [notes, setNotes] = useState('');
  const [favoriteCleaners, setFavoriteCleaners] = useState<string[]>([]);
  const [blacklistCleaners, setBlacklistCleaners] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [editingOrder, setEditingOrder] = useState<OrderDetail | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/cleaners')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCleanersList(data))
      .catch(console.error);
  }, []);

  const parseCleaners = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((v) => (typeof v === 'object' ? v.name : String(v)));
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return val.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
        if (data.length > 0 && !selectedClient) {
          applyClientData(data[0]);
        } else if (selectedClient) {
          const fresh = data.find((c: any) => c.id === selectedClient.id);
          if (fresh) applyClientData(fresh);
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки клиентов:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const applyClientData = (client: any) => {
    setSelectedClient(client);
    setNotes(client.notes || '');
    setFavoriteCleaners(parseCleaners(client.favoriteCleaner || client.favoriteCleaners));
    setBlacklistCleaners(parseCleaners(client.blacklistCleaner || client.blacklistedCleaners));
  };

  const handleSelectClient = (client: any) => {
    applyClientData(client);
  };

  const handleSaveNotes = async () => {
    if (!selectedClient) return;
    setSaving(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedClient.id,
          notes,
          favoriteCleaner: favoriteCleaners.join(', '),
          blacklistCleaner: blacklistCleaners.join(', '),
        }),
      });

      if (res.ok) {
        alert('✅ Предпочтения клиента успешно сохранены');
        fetchClients();
      } else {
        alert('Ошибка сохранения');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка соединения');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenOrder = (order: any) => {
    const parts = (order.timeSlot || `${order.startTime || '10:00'} — ${order.endTime || '13:00'}`)
      .split('—')
      .map((s: string) => s.trim());

    const orderData: OrderDetail = {
      ...order,
      date: order.date ? new Date(order.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      startTime: parts[0] || order.startTime || '10:00',
      endTime: parts[1] || order.endTime || '13:00',
      assignedCleaners: (order.assignedCleaners || []).map((ac: any) => ac.cleaner || ac),
    };

    setEditingOrder(orderData);
    setIsOrderModalOpen(true);
  };

  const handleRepeatOrder = (pastOrder: any, e: React.MouseEvent) => {
    e.stopPropagation();

    const parts = (pastOrder.timeSlot || `${pastOrder.startTime || '10:00'} — ${pastOrder.endTime || '13:00'}`)
      .split('—')
      .map((s: string) => s.trim());

    const clonedOrder: OrderDetail = {
      ...pastOrder,
      id: undefined,
      orderNumber: undefined,
      status: 'CONFIRMED',
      date: new Date().toISOString().slice(0, 10),
      startTime: parts[0] || pastOrder.startTime || '10:00',
      endTime: parts[1] || pastOrder.endTime || '13:00',
      clientName: selectedClient.name || pastOrder.clientName,
      clientPhone: selectedClient.phone || pastOrder.clientPhone,
      addressLine1: pastOrder.addressLine1 || selectedClient.address,
      addressLine2: pastOrder.addressLine2 || '',
      assignedCleaners: (pastOrder.assignedCleaners || []).map((ac: any) => ac.cleaner || ac),
      notes: pastOrder.notes || selectedClient.notes || '',
      paymentMethod: 'CASH',
      cashCollectedById: null,
    };

    setEditingOrder(clonedOrder);
    setIsOrderModalOpen(true);
  };

  const handleSaveOrder = async (saved: OrderDetail) => {
    try {
      const payload = {
        ...saved,
        assignedCleaners: (saved.assignedCleaners || []).map((c: any) => ({
          id: typeof c === 'object' ? (c.id || c.cleanerId) : c,
          name: c.name,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsOrderModalOpen(false);
        setEditingOrder(null);
        fetchClients();
      } else {
        alert('Ошибка при сохранении заказа');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка соединения');
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search) ||
      (c.address || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="p-10 text-center text-slate-500 text-xs">Загрузка клиентской базы...</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col pb-6">
      {/* Шапка */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">👥 База клиентов и LTV</h1>
          <p className="text-xs text-slate-500">
            История заказов, быстрый повтор заказа, предпочтения и клинеры
          </p>
        </div>
        <div className="w-72">
          <input
            type="text"
            placeholder="🔍 Поиск по имени, телефону, адресу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 shadow-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 overflow-hidden">
        {/* Список клиентов (слева) */}
        <div className="md:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center text-xs font-bold text-slate-600">
            <span>Клиенты ({filteredClients.length})</span>
            <span>Сумма LTV</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {filteredClients.map((client) => {
              const isSelected = selectedClient?.id === client.id;
              return (
                <div
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className={`p-4 cursor-pointer transition flex justify-between items-start ${
                    isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900">{client.name || 'Без имени'}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">📞 {client.phone || 'Нет телефона'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[220px]">
                      📍 {client.address || 'Адрес не указан'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-emerald-600 block">
                      {client.totalSpent || 0} zł
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                      {client.ordersCount || client.orders?.length || 0} заказов
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Детальная карточка клиента (справа) */}
        <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col overflow-hidden">
          {selectedClient ? (
            <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
              {/* Шапка клиента */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedClient.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    📞 {selectedClient.phone} • 📍 {selectedClient.address || 'Адрес не указан'}
                  </p>
                </div>
                <div className="text-right bg-blue-50 border border-blue-100 p-2.5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">LTV Клиента</span>
                  <span className="text-base font-extrabold text-blue-600">
                    {selectedClient.totalSpent || 0} zł
                  </span>
                </div>
              </div>

              {/* Предпочтения и выбор клинеров */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  📝 Предпочтения и назначение клинеров
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ЛЮБИМЫЕ КЛИНЕРЫ */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                      💚 Любимые клинеры
                    </label>
                    <select
                      onChange={(e) => {
                        const selectedId = Number(e.target.value);
                        if (!selectedId) return;
                        const cl = cleanersList.find((c) => c.id === selectedId);
                        if (cl && !favoriteCleaners.includes(cl.name)) {
                          setFavoriteCleaners([...favoriteCleaners, cl.name]);
                        }
                        e.target.value = '';
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700"
                    >
                      <option value="">+ Добавить любимого...</option>
                      {cleanersList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-wrap gap-1.5 min-h-6">
                      {favoriteCleaners.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold"
                        >
                          ⭐️ {name}
                          <button
                            type="button"
                            onClick={() => setFavoriteCleaners(favoriteCleaners.filter((n) => n !== name))}
                            className="hover:text-emerald-950 font-bold ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* НЕЛИЮБИМЫЕ КЛИНЕРЫ */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-rose-800 uppercase flex items-center gap-1">
                      🚫 Черный список (не отправлять)
                    </label>
                    <select
                      onChange={(e) => {
                        const selectedId = Number(e.target.value);
                        if (!selectedId) return;
                        const cl = cleanersList.find((c) => c.id === selectedId);
                        if (cl && !blacklistCleaners.includes(cl.name)) {
                          setBlacklistCleaners([...blacklistCleaners, cl.name]);
                        }
                        e.target.value = '';
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700"
                    >
                      <option value="">+ Добавить в нежелательные...</option>
                      {cleanersList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-wrap gap-1.5 min-h-6">
                      {blacklistCleaners.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold"
                        >
                          ⛔️ {name}
                          <button
                            type="button"
                            onClick={() => setBlacklistCleaners(blacklistCleaners.filter((n) => n !== name))}
                            className="hover:text-rose-950 font-bold ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Важные детали квартиры / домофон / ключи
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Например: Дома кот, домофон 41K, ключи под ковриком..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs"
                >
                  {saving ? 'Сохранение...' : 'Сохранить предпочтения'}
                </button>
              </div>

              {/* История заказов клиента (Кликабельная + Повтор) */}
              <div className="space-y-3 flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    🗓 История всех уборок ({selectedClient.orders?.length || 0})
                  </h3>
                  <span className="text-[10px] text-slate-400">Нажмите на заказ для просмотра</span>
                </div>

                <div className="space-y-2">
                  {selectedClient.orders && selectedClient.orders.length > 0 ? (
                    selectedClient.orders.map((order: any) => {
                      const team =
                        order.assignedCleaners?.map((ac: any) => ac.cleaner?.name || ac.name).join(' + ') ||
                        'Бригада не указана';

                      const isCompleted = order.status === 'COMPLETED';

                      return (
                        <div
                          key={order.id}
                          onClick={() => handleOpenOrder(order)}
                          className="p-3.5 bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xs rounded-xl flex justify-between items-center text-xs transition cursor-pointer group"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-600 group-hover:underline">
                                {order.orderNumber}
                              </span>
                              <span className="font-bold text-slate-800">{order.serviceType}</span>
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {new Date(order.date).toLocaleDateString('ru-RU')}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isCompleted
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {isCompleted ? '✓ Оплачен' : order.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              👥 Клинеры: <span className="font-medium text-slate-700">{team}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-extrabold text-slate-900 text-sm block">
                                {order.price} zł
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {order.timeSlot || '10:00 — 14:00'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleRepeatOrder(order, e)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 font-bold rounded-lg text-xs transition flex items-center gap-1 shadow-2xs"
                              title="Создать новый заказ с такими же параметрами"
                            >
                              🔁 Повторить
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                      У клиента пока нет оформленных заказов
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-slate-400 text-xs my-auto">Выберите клиента из списка слева</div>
          )}
        </div>
      </div>

      <OrderModal
        order={editingOrder}
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setEditingOrder(null);
        }}
        onSave={handleSaveOrder}
      />
    </div>
  );
}
