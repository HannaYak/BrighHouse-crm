"use client";
import React, { useState, useEffect } from 'react';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [cleanersList, setCleanersList] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  // Редактирование заметок и предпочтений
  const [notes, setNotes] = useState('');
  const [favoriteCleaners, setFavoriteCleaners] = useState<string[]>([]);
  const [blacklistCleaners, setBlacklistCleaners] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Загрузка клинеров для выпадающего списка
  useEffect(() => {
    fetch('/api/cleaners')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCleanersList(data))
      .catch(console.error);
  }, []);

  const parseCleanerList = (val: any): string[] => {
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
          applyClientSelection(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const applyClientSelection = (client: any) => {
    setSelectedClient(client);
    setNotes(client.notes || '');
    setFavoriteCleaners(parseCleanerList(client.favoriteCleaners || client.favoriteCleaner));
    setBlacklistCleaners(parseCleanerList(client.blacklistedCleaners || client.blacklistCleaner));
  };

  const handleSelectClient = (client: any) => {
    applyClientSelection(client);
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
          favoriteCleaners,
          favoriteCleaner: favoriteCleaners.join(', '),
          blacklistedCleaners: blacklistCleaners,
          blacklistCleaner: blacklistCleaners.join(', '),
        }),
      });

      if (res.ok) {
        alert('✅ Данные клиента сохранены');
        fetchClients();
      } else {
        alert('Ошибка сохранения данных клиента');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка соединения с сервером');
    } finally {
      setSaving(false);
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
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">👥 База клиентов и LTV</h1>
          <p className="text-xs text-slate-500">История заказов, предпочтения, любимые клинеры и заметки</p>
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
        {/* Список клиентов слева */}
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
                    <span className="text-xs font-extrabold text-emerald-600 block">{client.totalSpent || 0} zł</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                      {client.ordersCount || 0} заказов
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Карточка выбранного клиента справа */}
        <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col overflow-hidden">
          {selectedClient ? (
            <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
              {/* Шапка карточки */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedClient.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    📞 {selectedClient.phone} • 📍 {selectedClient.address}
                  </p>
                </div>
                <div className="text-right bg-blue-50 border border-blue-100 p-2.5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">LTV Клиента</span>
                  <span className="text-base font-extrabold text-blue-600">{selectedClient.totalSpent || 0} zł</span>
                </div>
              </div>

              {/* Предпочтения и особенности */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  📝 Предпочтения и клинеры
                </h3>

                {/* Селекторы клинеров */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ЛЮБИМЫЕ КЛИНЕРЫ */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-emerald-700 uppercase flex items-center gap-1">
                      💚 Любимые клинеры
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        const selectedId = Number(e.target.value);
                        if (!selectedId) return;
                        const cl = cleanersList.find((c) => c.id === selectedId);
                        if (cl && !favoriteCleaners.includes(cl.name)) {
                          setFavoriteCleaners([...favoriteCleaners, cl.name]);
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700"
                    >
                      <option value="">+ Добавить любимого клинера...</option>
                      {cleanersList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-wrap gap-1.5 pt-1">
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

                  {/* ЧЕРНЫЙ СПИСОК КЛИЕНТА */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-rose-700 uppercase flex items-center gap-1">
                      🚫 Не отправлять (Черный список)
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        const selectedId = Number(e.target.value);
                        if (!selectedId) return;
                        const cl = cleanersList.find((c) => c.id === selectedId);
                        if (cl && !blacklistCleaners.includes(cl.name)) {
                          setBlacklistCleaners([...blacklistCleaners, cl.name]);
                        }
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

                    <div className="flex flex-wrap gap-1.5 pt-1">
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

                {/* Заметки */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Важные детали квартиры / пожелания
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Например: Дома кот, ключи у консьержа, использовать эко-химию..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                  />
                </div>

                <button
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                >
                  {saving ? 'Сохранение...' : 'Сохранить заметки'}
                </button>
              </div>

              {/* История уборок */}
              <div className="space-y-3 flex-1">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  🗓 История всех уборок ({selectedClient.orders?.length || 0})
                </h3>

                <div className="space-y-2">
                  {selectedClient.orders?.map((order: any) => {
                    const team =
                      order.assignedCleaners?.map((ac: any) => ac.cleaner?.name).join(' + ') ||
                      'Бригада не указана';
                    return (
                      <div
                        key={order.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-600">{order.orderNumber}</span>
                            <span className="font-bold text-slate-800">{order.serviceType}</span>
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {new Date(order.date).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">👥 Клинеры: {team}</div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-slate-900">{order.price} zł</span>
                          <span className="text-[10px] text-slate-400 block">{order.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-slate-400 text-xs my-auto">Выберите клиента из списка слева</div>
          )}
        </div>
      </div>
    </div>
  );
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: 'ID клиента обязателен' }, { status: 400 });
    }

    // Если ID в базе числовой — парсим, если строка (cuid/uuid) — оставляем как есть
    const clientWhere = isNaN(Number(id)) ? { id } : { id: Number(id) };

    await prisma.client.delete({
      where: clientWhere as any,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ошибка удаления клиента:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
