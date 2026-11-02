"use client";
import React, { useState, useEffect, useMemo } from 'react';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [cleanersList, setCleanersList] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  // Фильтры и сортировка
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'LTV' | 'ORDERS' | 'RECENT' | 'NAME'>('LTV');

  const [notes, setNotes] = useState('');
  const [favoriteCleaners, setFavoriteCleaners] = useState<string[]>([]);
  const [blacklistCleaners, setBlacklistCleaners] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [editingOrder, setEditingOrder] = useState<OrderDetail | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Мобильная навигация: список / детали
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Модалка импорта клиентов
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

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
    setNotes(client.cleanNotes || client.notes || '');
    setFavoriteCleaners(parseCleaners(client.favoriteCleaner || client.favoriteCleaners));
    setBlacklistCleaners(parseCleaners(client.blacklistCleaner || client.blacklistedCleaners));
  };

  const handleSelectClient = (client: any) => {
    applyClientData(client);
    setMobileShowDetail(true);
  };

  const getChannelBadge = (channel: string) => {
    const ch = (channel || '').toLowerCase();
    if (ch.includes('insta')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
          📸 Instagram
        </span>
      );
    }
    if (ch.includes('what') || ch.includes('wa')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          💬 WhatsApp
        </span>
      );
    }
    if (ch.includes('tg') || ch.includes('телеграм')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
          ✈️ Telegram
        </span>
      );
    }
    if (ch.includes('booksy')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          📖 Booksy
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
        📞 Звонок / Сайт
      </span>
    );
  };

  const getClientTypeBadge = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('постоянный')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
          💎 Постоянный
        </span>
      );
    }
    if (t.includes('абон') || t.includes('субабон')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
          🎫 Абонемент
        </span>
      );
    }
    if (t.includes('частый')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          ⭐️ Частый
        </span>
      );
    }
    if (t.includes('новичок')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
          🆕 Новичок
        </span>
      );
    }
    if (t.includes('редкий')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
          🌿 Редкий
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
        ⚪️ Разовый
      </span>
    );
  };

  const filteredClients = useMemo(() => {
    return clients
      .filter((c) => {
        const matchesSearch =
          (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.phone || '').includes(search) ||
          (c.address || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.notes || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.promoCode || '').toLowerCase().includes(search.toLowerCase());

        if (!matchesSearch) return false;

        if (channelFilter !== 'ALL') {
          const ch = (c.channel || '').toLowerCase();
          if (channelFilter === 'Instagram' && !ch.includes('insta')) return false;
          if (channelFilter === 'WhatsApp' && !ch.includes('what') && !ch.includes('wa')) return false;
          if (channelFilter === 'Telegram' && !ch.includes('tg') && !ch.includes('телеграм')) return false;
          if (channelFilter === 'Booksy' && !ch.includes('booksy')) return false;
          if (channelFilter === 'CALL' && !ch.includes('звонок') && !ch.includes('сайт')) return false;
        }

        if (typeFilter !== 'ALL') {
          const ct = (c.clientType || '').toLowerCase();
          if (typeFilter === 'постоянный' && !ct.includes('постоянный')) return false;
          if (typeFilter === 'абонемент' && !ct.includes('абон')) return false;
          if (typeFilter === 'частый' && !ct.includes('частый')) return false;
          if (typeFilter === 'новичок' && !ct.includes('новичок')) return false;
          if (typeFilter === 'редкий' && !ct.includes('редкий')) return false;
          if (typeFilter === 'разовый' && !ct.includes('разовый')) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'LTV') return (b.totalSpent || 0) - (a.totalSpent || 0);
        if (sortBy === 'ORDERS') return (b.ordersCount || 0) - (a.ordersCount || 0);
        if (sortBy === 'RECENT') {
          const da = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
          const db = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
          return db - da;
        }
        if (sortBy === 'NAME') return (a.name || '').localeCompare(b.name || '');
        return 0;
      });
  }, [clients, search, channelFilter, typeFilter, sortBy]);

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
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const normalizeOrderForModal = (rawOrder: any, isClone = false): OrderDetail => {
    const slot = rawOrder.timeSlot || `${rawOrder.startTime || '10:00'} — ${rawOrder.endTime || '13:00'}`;
    const parts = slot.split('—').map((s: string) => s.trim());
    const start = parts[0] || rawOrder.startTime || '10:00';
    const end = parts[1] || rawOrder.endTime || '13:00';

    return {
      id: isClone ? undefined : rawOrder.id,
      orderNumber: isClone ? undefined : rawOrder.orderNumber,
      date: isClone
        ? new Date().toISOString().slice(0, 10)
        : rawOrder.date
        ? new Date(rawOrder.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      startTime: start,
      endTime: end,
      timeSlot: `${start} — ${end}`,
      status: isClone ? 'NEW' : rawOrder.status || 'NEW',
      serviceType: rawOrder.serviceType || 'STANDARD',
      areaM2: Number(rawOrder.areaM2) || 45,
      roomsCount: Number(rawOrder.roomsCount) || 1,
      bathroomsCount: Number(rawOrder.bathroomsCount) || 1,
      windowsCount: Number(rawOrder.windowsCount) || 0,
      showcaseWindowsCount: Number(rawOrder.showcaseWindowsCount) || 0,
      balconyWindowsCount: Number(rawOrder.balconyWindowsCount) || 0,
      hasOven: Boolean(rawOrder.hasOven),
      hasFridge: Boolean(rawOrder.hasFridge),
      hasFridgeFreeze: Boolean(rawOrder.hasFridgeFreeze),
      hasMicrowave: Boolean(rawOrder.hasMicrowave),
      hasBalcony: Boolean(rawOrder.hasBalcony),
      hasKitchenClosets: Boolean(rawOrder.hasKitchenClosets),
      hasStairs: Boolean(rawOrder.hasStairs),
      hasSteamer: Boolean(rawOrder.hasSteamer),
      hasDishesHours: Number(rawOrder.hasDishesHours) || 0,
      hasIroningHours: Number(rawOrder.hasIroningHours) || 0,
      hasVacuum: Boolean(rawOrder.hasVacuum),
      hasPets: Boolean(rawOrder.hasPets),
      hasKeys: Boolean(rawOrder.hasKeys),
      drySofa2: Number(rawOrder.drySofa2) || 0,
      drySofa3: Number(rawOrder.drySofa3) || 0,
      drySofaCorner4: Number(rawOrder.drySofaCorner4) || 0,
      dryArmchair: Number(rawOrder.dryArmchair) || 0,
      dryMattressSide: Number(rawOrder.dryMattressSide) || 0,
      clientName: selectedClient?.name || rawOrder.clientName || '',
      clientPhone: selectedClient?.phone || rawOrder.clientPhone || '',
      addressLine1: rawOrder.addressLine1 || selectedClient?.address || '',
      addressLine2: rawOrder.addressLine2 || '',
      price: Number(rawOrder.price) || 0,
      cleanersCount: Math.max(1, rawOrder.assignedCleaners?.length || 1),
      assignedCleaners: (rawOrder.assignedCleaners || []).map((ac: any) => ac.cleaner || ac),
      notes: rawOrder.notes || '',
      paymentMethod: rawOrder.paymentMethod || 'CASH',
      cashCollectedById: rawOrder.cashCollectedById || null,
    };
  };

  const handleOpenOrder = (order: any) => {
    const formatted = normalizeOrderForModal(order, false);
    setEditingOrder(formatted);
    setIsOrderModalOpen(true);
  };

  const handleRepeatOrder = (pastOrder: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cloned = normalizeOrderForModal(pastOrder, true);
    setEditingOrder(cloned);
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
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Ошибка при сохранении заказа');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const getOrderAddonsBadge = (order: any) => {
    const list: string[] = [];
    if (order.hasOven) list.push('Духовка');
    if (order.hasFridge || order.hasFridgeFreeze) list.push('Холодильник');
    if (order.windowsCount > 0) list.push(`${order.windowsCount} окон`);
    if (order.drySofa2 > 0 || order.drySofa3 > 0 || order.drySofaCorner4 > 0) list.push('Химчистка');
    if (order.hasSteamer) list.push('Пароочиститель');
    if (list.length === 0) return null;
    return list.slice(0, 3).join(', ') + (list.length > 3 ? '...' : '');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold">Загрузка клиентской базы и LTV...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-full min-h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-4.5rem)] flex flex-col px-2 sm:px-4">
      {/* Шапка */}
      <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 shrink-0 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>👥</span>
            <span>Клиентская база и LTV</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Все клиенты ({clients.length}), источники привлечения, история всех уборок и расчет LTV
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="flex-1 sm:w-72">
            <input
              type="text"
              placeholder="🔍 Поиск по имени, телефону, адресу, нику..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 shadow-xs focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Панель фильтров: Источники, Категории и Сортировка */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Канал:
          </span>
          {[
            { id: 'ALL', label: 'Все' },
            { id: 'Instagram', label: '📸 Instagram' },
            { id: 'WhatsApp', label: '💬 WhatsApp' },
            { id: 'Telegram', label: '✈️ Telegram' },
            { id: 'Booksy', label: '📖 Booksy' },
            { id: 'CALL', label: '📞 Звонки / Сайт' },
          ].map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => setChannelFilter(ch.id)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                channelFilter === ch.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Тип:
          </span>
          {[
            { id: 'ALL', label: 'Все' },
            { id: 'постоянный', label: '💎 Постоянные' },
            { id: 'абонемент', label: '🎫 Абонементы' },
            { id: 'частый', label: '⭐️ Частые' },
            { id: 'новичок', label: '🆕 Новички' },
            { id: 'редкий', label: '🌿 Редкие' },
            { id: 'разовый', label: '⚪️ Разовые' },
          ].map((tp) => (
            <button
              key={tp.id}
              type="button"
              onClick={() => setTypeFilter(tp.id)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                typeFilter === tp.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tp.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Сортировка:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg px-2 py-1 outline-none"
          >
            <option value="LTV">💰 По LTV (убывание)</option>
            <option value="ORDERS">📦 По количеству заказов</option>
            <option value="RECENT">⏱️ По дате последнего заказа</option>
            <option value="NAME">🔤 По имени (А-Я)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 overflow-hidden min-h-0">
        {/* Список клиентов (слева) */}
        <div className={`md:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col overflow-hidden ${
          mobileShowDetail ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center text-xs font-bold text-slate-600">
            <span>Клиенты ({filteredClients.length})</span>
            <span>Сумма LTV</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {filteredClients.map((client) => {
              const isSelected = selectedClient?.id === client.id;
              const cleanPhoneNum = (client.phone || '').replace(/\D/g, '');
              const isFakePhone = (client.phone || '').includes('NO_PHONE');

              return (
                <div
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className={`p-3.5 cursor-pointer transition flex justify-between items-start gap-2 ${
                    isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-slate-900 truncate">
                      {client.name || 'Без имени'}
                    </div>

                    {/* Бейджи канала и типа */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {getChannelBadge(client.channel)}
                      {getClientTypeBadge(client.clientType)}
                      {client.promoCode && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          🏷️ {client.promoCode}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono">{isFakePhone ? '📞 Без телефона' : client.phone}</span>
                      {!isFakePhone && cleanPhoneNum && (
                        <a
                          href={`https://wa.me/${cleanPhoneNum}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[9px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-1 py-0.2 rounded font-bold transition"
                          title="Открыть в WhatsApp"
                        >
                          💬 WA
                        </a>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[240px]">
                      📍 {client.address || 'Адрес не указан'}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-emerald-600 block">
                      {(client.totalSpent || 0).toLocaleString()} zł
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                      {client.ordersCount || client.orders?.length || 0} заказов
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredClients.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                По выбранным фильтрам клиенты не найдены
              </div>
            )}
          </div>
        </div>

        {/* Детальная карточка клиента (справа) */}
        <div className={`md:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col overflow-hidden ${
          mobileShowDetail ? 'flex' : 'hidden md:flex'
        }`}>
          {selectedClient ? (
            <div className="flex flex-col h-full overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Кнопка "Назад к списку" для мобильных */}
              <div className="md:hidden flex items-center pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setMobileShowDetail(false)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 py-1"
                >
                  ← Назад к списку клиентов
                </button>
              </div>

              {/* Шапка клиента */}
              <div className="flex flex-wrap sm:flex-nowrap justify-between items-start border-b border-slate-100 pb-4 gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-xl font-black text-slate-900">{selectedClient.name}</h2>
                    {getChannelBadge(selectedClient.channel)}
                    {getClientTypeBadge(selectedClient.clientType)}
                    {selectedClient.promoCode && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        🏷️ Промо: {selectedClient.promoCode}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs text-slate-600 font-mono font-bold">
                      📞 {selectedClient.phone?.includes('NO_PHONE') ? 'Без телефона' : selectedClient.phone}
                    </span>
                    {!selectedClient.phone?.includes('NO_PHONE') && selectedClient.phone && (
                      <>
                        <a
                          href={`https://wa.me/${selectedClient.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition shadow-2xs"
                          title="Написать в WhatsApp"
                        >
                          💬 WhatsApp
                        </a>
                        <a
                          href={`https://t.me/+${selectedClient.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition shadow-2xs"
                          title="Написать в Telegram"
                        >
                          ✈️ Telegram
                        </a>
                        <a
                          href={`tel:${selectedClient.phone}`}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition"
                          title="Позвонить"
                        >
                          📞 Звонок
                        </a>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                    <span>📍</span>
                    <span>{selectedClient.address || 'Адрес не указан'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {selectedClient.orders && selectedClient.orders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRepeatOrder(selectedClient.orders[0])}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
                    >
                      🔁 Повторить заказ
                    </button>
                  )}
                </div>
              </div>

              {/* МЕТРИКИ КЛИЕНТА (LTV ТАЙЛЫ) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">LTV Клиента</span>
                  <span className="text-lg sm:text-xl font-black text-blue-600">
                    {(selectedClient.totalSpent || 0).toLocaleString()} zł
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Всего заказов</span>
                  <span className="text-lg sm:text-xl font-black text-slate-900">
                    {selectedClient.ordersCount || selectedClient.orders?.length || 0} шт.
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Средний чек</span>
                  <span className="text-lg sm:text-xl font-black text-slate-900">
                    {selectedClient.averageCheck || (selectedClient.orders?.length ? Math.round(selectedClient.totalSpent / selectedClient.orders.length) : 0)} zł
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Первый заказ</span>
                  <span className="text-xs font-extrabold text-slate-700 block mt-1">
                    {selectedClient.firstOrderDate
                      ? new Date(selectedClient.firstOrderDate).toLocaleDateString('ru-RU')
                      : selectedClient.orders?.length
                      ? new Date(selectedClient.orders[selectedClient.orders.length - 1].date).toLocaleDateString('ru-RU')
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Предпочтения и клинеры */}
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

                  {/* НЕЖЕЛАТЕЛЬНЫЕ КЛИНЕРЫ */}
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
                    Важные детали квартиры / домофон / ключи / заметки
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Например: Дома кот, домофон 41K, ключи под ковриком, эконом..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {saving ? 'Сохранение...' : 'Сохранить предпочтения'}
                </button>
              </div>

              {/* История всех заказов клиента (Хронология) */}
              <div className="space-y-3 flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    🗓 История всех уборок ({selectedClient.orders?.length || 0})
                  </h3>
                  <span className="text-[10px] text-slate-400">Клик по заказу для просмотра деталей</span>
                </div>

                <div className="space-y-2">
                  {selectedClient.orders && selectedClient.orders.length > 0 ? (
                    selectedClient.orders.map((order: any) => {
                      const team =
                        order.assignedCleaners?.map((ac: any) => ac.cleaner?.name || ac.name).join(' + ') ||
                        'Архивный заказ';

                      const isCompleted = order.status === 'COMPLETED';
                      const addonsText = getOrderAddonsBadge(order);

                      return (
                        <div
                          key={order.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleOpenOrder(order)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleOpenOrder(order);
                          }}
                          className="w-full text-left p-3.5 bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs rounded-xl flex justify-between items-center text-xs transition cursor-pointer group pointer-events-auto"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-blue-600 group-hover:underline">
                                {order.orderNumber || `#${String(order.id).slice(0, 6)}`}
                              </span>
                              <span className="font-bold text-slate-800">
                                {order.serviceType === 'GENERAL' ? 'Генеральная уборка' :
                                 order.serviceType === 'AFTER_REPAIR' ? 'После ремонта' :
                                 order.serviceType === 'OFFICE_REGULAR' ? 'Офис' : 'Комплексная уборка'}
                              </span>
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                                📅 {new Date(order.date).toLocaleDateString('ru-RU')}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isCompleted
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {isCompleted ? '✓ Выполнен' : order.status || 'В работе'}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                              <span>📍 {order.addressLine1 || selectedClient.address}</span>
                              {order.roomsCount > 0 && <span>• {order.roomsCount} комн.</span>}
                              {addonsText && (
                                <span className="text-slate-400 font-medium">({addonsText})</span>
                              )}
                            </div>

                            {order.notes && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[400px]">
                                {order.notes}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="font-black text-slate-900 text-sm block">
                                {order.price} zł
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {order.timeSlot || '10:00 — 14:00'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleRepeatOrder(order, e)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 font-bold rounded-lg text-xs transition flex items-center gap-1 shadow-2xs cursor-pointer z-10"
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

      {/* Модалка заказа */}
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
