"use client";
import React, { useState, useEffect } from 'react';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

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
    setNotes(client.notes || '');
    setFavoriteCleaners(parseCleaners(client.favoriteCleaner || client.favoriteCleaners));
    setBlacklistCleaners(parseCleaners(client.blacklistCleaner || client.blacklistedCleaners));
  };

  const handleSelectClient = (client: any) => {
    applyClientData(client);
    setMobileShowDetail(true);
  };

  const parseImportData = () => {
    if (!importText.trim()) return [];
    const lines = importText.trim().split('\n');
    const result: any[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      // Пропуск заголовка таблицы
      if (line.toLowerCase().startsWith('имя') || line.toLowerCase().startsWith('name')) continue;

      // Разделение по табуляции, точке с запятой или запятой
      const parts = line.includes('\t')
        ? line.split('\t')
        : line.includes(';')
        ? line.split(';')
        : line.split(',');

      if (parts.length >= 2) {
        const name = parts[0]?.trim() || 'Клиент';
        const phone = parts[1]?.trim() || '';
        const address = parts[2]?.trim() || 'Варшава';
        const notes = parts[3]?.trim() || '';
        const cleaner = parts[4]?.trim() || '';
        const count = parts[5] ? parseInt(parts[5].trim(), 10) : 0;
        const total = parts[6] ? parseFloat(parts[6].trim().replace(/\s/g, '')) : 0;

        if (phone) {
          result.push({
            name,
            phone,
            address,
            notes,
            favoriteCleaner: cleaner,
            ordersCount: count,
            totalSpent: total,
          });
        }
      }
    }
    return result;
  };

  const handleDownloadTemplate = () => {
    const csvContent = '\uFEFF' + [
      'Имя;Телефон;Адрес;Заметки;Любимый клинер;Количество прошлых заказов;Общая сумма LTV (zł)',
      'Анна Новак;+48 514 564 785;ul. Marszalkowska 10/4;Код домофона 1234;Ольга;3;650',
      'Павел Ковальски;+48 888 123 456;ul. Mokotowska 15;Есть собака корги;Татьяна;1;220',
      'Ольга Шевченко;+48 501 222 333;ul. Grzybowska 4;Уборка раз в 2 недели;Елена;5;1100',
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'brighthouse_clients_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExecuteImport = async () => {
    const clientsToImport = parseImportData();
    if (clientsToImport.length === 0) {
      alert('Нет распознанных строк для импорта. Убедитесь, что в каждой строке указаны как минимум Имя и Телефон.');
      return;
    }

    try {
      setIsImporting(true);
      const res = await fetch('/api/clients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: clientsToImport }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`✅ Успешно импортировано!\n• Создано новых клиентов: ${data.createdCount}\n• Обновлено существующих: ${data.updatedCount}\n• Создано архивных нарядов: ${data.ordersCreatedCount}`);
        setIsImportModalOpen(false);
        setImportText('');
        fetchClients();
      } else {
        alert(`Ошибка импорта: ${data.error || 'Неизвестная ошибка'}`);
      }
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    } finally {
      setIsImporting(false);
    }
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
      status: isClone ? 'CONFIRMED' : rawOrder.status || 'CONFIRMED',
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
        alert('Ошибка при сохранении заказа');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка соединения');
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
    <div className="space-y-4 max-w-7xl mx-auto h-full min-h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-4.5rem)] flex flex-col">
      {/* Шапка */}
      <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">👥 База клиентов и LTV</h1>
          <p className="text-xs text-slate-500">
            История заказов, быстрый повтор заказа, предпочтения и клинеры
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>📥</span>
            <span>Импорт клиентов</span>
          </button>
          <div className="flex-1 sm:w-72">
            <input
              type="text"
              placeholder="🔍 Поиск по имени, телефону, адресу..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 shadow-xs"
            />
          </div>
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
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span>📞 {client.phone || 'Нет телефона'}</span>
                      {client.phone && (
                        <a
                          href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[9px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded font-bold transition"
                          title="Открыть в WhatsApp"
                        >
                          💬 WA
                        </a>
                      )}
                    </div>
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
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">{selectedClient.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500 font-mono">📞 {selectedClient.phone || 'Без телефона'}</span>
                    {selectedClient.phone && (
                      <a
                        href={`https://wa.me/${selectedClient.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition shadow-2xs"
                        title="Написать клиенту в WhatsApp"
                      >
                        💬 WhatsApp
                      </a>
                    )}
                    {selectedClient.phone && (
                      <a
                        href={`tel:${selectedClient.phone}`}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition"
                        title="Позвонить клиенту"
                      >
                        📞 Звонок
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    📍 {selectedClient.address || 'Адрес не указан'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {selectedClient.orders && selectedClient.orders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRepeatOrder(selectedClient.orders[0])}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center gap-1.5"
                    >
                      🔁 Повторить последний
                    </button>
                  )}
                  <div className="text-right bg-blue-50 border border-blue-100 p-2.5 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-blue-700 block">LTV Клиента</span>
                    <span className="text-base font-extrabold text-blue-600">
                      {selectedClient.totalSpent || 0} zł
                    </span>
                  </div>
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
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
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
                  <span className="text-[10px] text-slate-400">Нажмите на карточку для просмотра</span>
                </div>

                <div className="space-y-2">
                  {selectedClient.orders && selectedClient.orders.length > 0 ? (
                    selectedClient.orders.map((order: any) => {
                      const team =
                        order.assignedCleaners?.map((ac: any) => ac.cleaner?.name || ac.name).join(' + ') ||
                        'Бригада не указана';

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
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-600 group-hover:underline">
                                {order.orderNumber || `#${String(order.id).slice(0, 6)}`}
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
                                {isCompleted ? '✓ Оплачен' : order.status || 'В работе'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              👥 Клинеры: <span className="font-medium text-slate-700">{team}</span>
                              {addonsText && (
                                <span className="ml-2 text-slate-400">({addonsText})</span>
                              )}
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

      {/* Модалка импорта клиентов */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Заголовок модалки */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="text-xl">📥</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Импорт базы клиентов и истории</h3>
                  <p className="text-[11px] text-slate-500">Вставьте данные из Excel / Google Таблиц или CSV</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Тело модалки */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-800 space-y-2">
                <div className="font-bold flex items-center justify-between">
                  <span>📋 Формат колонок (через Tab, запятую или точку с запятой):</span>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-blue-700 underline hover:text-blue-900 text-[11px] font-bold cursor-pointer"
                  >
                    📥 Скачать шаблон CSV
                  </button>
                </div>
                <div className="text-[11px] font-mono bg-white/80 p-2 rounded border border-blue-100 overflow-x-auto whitespace-pre">
                  Имя ; Телефон ; Адрес ; Заметки ; Любимый клинер ; Количество уборок ; LTV (zł)
                </div>
                <p className="text-[11px] text-blue-600">
                  💡 Можно просто скопировать строки из Excel / Google Sheets и нажать <b>Ctrl+V</b> в поле ниже.
                  Если клиент уже есть в базе, его данные и LTV обновятся без дубликатов!
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Вставьте строки из таблицы:
                </label>
                <textarea
                  rows={8}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`Анна Новак\t+48 514 564 785\tul. Marszalkowska 10/4\tКод домофона 1234\tОльга\t3\t650\nПавел Ковальски\t+48 888 123 456\tul. Mokotowska 15\tЕсть собака\tТатьяна\t1\t220`}
                  className="w-full font-mono text-[11px] bg-slate-50 border border-slate-300 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {importText.trim() && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">
                    Распознано записей для импорта:
                  </span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {parseImportData().length} клиентов
                  </span>
                </div>
              )}
            </div>

            {/* Футер */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isImporting || parseImportData().length === 0}
                onClick={handleExecuteImport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isImporting ? '⏳ Импортируем...' : `✅ Загрузить (${parseImportData().length})`}
              </button>
            </div>
          </div>
        </div>
      )}

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
