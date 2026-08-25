"use client";
import React, { useState, useEffect } from 'react';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  // Редактирование заметок
  const [notes, setNotes] = useState('');
  const [favoriteCleaner, setFavoriteCleaner] = useState('');
  const [blacklistCleaner, setBlacklistCleaner] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
        if (data.length > 0 && !selectedClient) {
          setSelectedClient(data[0]);
          setNotes(data[0].notes || '');
          setFavoriteCleaner(data[0].favoriteCleaner || '');
          setBlacklistCleaner(data[0].blacklistCleaner || '');
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

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setNotes(client.notes || '');
    setFavoriteCleaner(client.favoriteCleaner || '');
    setBlacklistCleaner(client.blacklistCleaner || '');
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
          favoriteCleaner,
          blacklistCleaner,
        }),
      });
      if (res.ok) {
        alert('✅ Данные клиента сохранены');
        fetchClients();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = clients.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.address || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-10 text-center text-slate-500 text-xs">Загрузка клиентской базы...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
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
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 overflow-hidden">
        {/* Список клиентов (слева) */}
        <div className="md:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
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
                    isSelected ? 'bg-brand-50/70 border-l-4 border-brand-600' : 'hover:bg-slate-50'
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
                    <span className="text-xs font-extrabold text-emerald-600 block">{client.totalSpent} zł</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                      {client.ordersCount} заказов
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Детальная карточка клиента (справа) */}
        <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          {selectedClient ? (
            <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
              {/* Шапка карточки */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedClient.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">📞 {selectedClient.phone} • 📍 {selectedClient.address}</p>
                </div>
                <div className="text-right bg-brand-50 border border-brand-100 p-2.5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-brand-700 block">LTV Клиента</span>
                  <span className="text-base font-extrabold text-brand-600">{selectedClient.totalSpent} zł</span>
                </div>
              </div>

              {/* Предпочтения и заметки */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">📝 Предпочтения и особенности</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">⭐ Любимый клинер</label>
                    <input
                      type="text"
                      placeholder="Например: Анна"
                      value={favoriteCleaner}
                      onChange={(e) => setFavoriteCleaner(e.target.value)}
                      className="w-full mt-1 bg-white border border-slate-200 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">🚫 Не отправлять клинера</label>
                    <input
                      type="text"
                      placeholder="Кого не назначать"
                      value={blacklistCleaner}
                      onChange={(e) => setBlacklistCleaner(e.target.value)}
                      className="w-full mt-1 bg-white border border-slate-200 rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Важные детали квартиры / пожелания</label>
                  <textarea
                    rows={2}
                    placeholder="Например: Дома кот, ключи у консьержа, использовать эко-химию..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full mt-1 bg-white border border-slate-200 rounded-lg p-2 text-xs"
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
                    const team = order.assignedCleaners?.map((ac: any) => ac.cleaner?.name).join(' + ') || 'Бригада не указана';
                    return (
                      <div key={order.id} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-brand-600">{order.orderNumber}</span>
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
