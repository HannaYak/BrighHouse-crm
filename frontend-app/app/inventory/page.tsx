"use client";
import React, { useState, useEffect } from 'react';

export default function InventoryPage() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Модалка добавления
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'EQUIPMENT',
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eqRes, clRes] = await Promise.all([
        fetch('/api/equipment'),
        fetch('/api/cleaners'),
      ]);
      if (eqRes.ok) setEquipment(await eqRes.json());
      if (clRes.ok) setCleaners(await clRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Быстрая выдача / возврат / отправка в ремонт
  const handleUpdateStatus = async (id: number, status: string, holderId: number | null = null) => {
    try {
      const res = await fetch('/api/equipment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, holderId }),
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return alert('Введите название');

    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setForm({ name: '', category: 'EQUIPMENT', notes: '' });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить эту позицию с учета?')) return;
    try {
      const res = await fetch(`/api/equipment?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Инициализация дефолтного набора, если база пустая
  const handleSeedDefaults = async () => {
    const defaults = [
      { name: 'Строительный пылесос #1', category: 'HEAVY' },
      { name: 'Строительный пылесос #2', category: 'HEAVY' },
      { name: 'Моющий пылесос (Химчистка)', category: 'CLEANING' },
      { name: 'Стремянка', category: 'LADDER' },
      { name: 'Пароочиститель', category: 'STEAMER' },
      ...Array.from({ length: 8 }, (_, i) => ({ name: `Маленький пылесос №${i + 1}`, category: 'SMALL_VACUUM' })),
    ];

    for (const item of defaults) {
      await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
    }
    fetchData();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Шапка */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">🛠️ Склад и учет оборудования</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Контроль техники BrightHouse: пылесосы, стремянки, пароочистители у клинеров и на базе
          </p>
        </div>

        <div className="flex items-center gap-2">
          {equipment.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-xs"
            >
              ⚡ Загрузить стартовый набор (13 ед.)
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5"
          >
            ➕ Добавить оборудование
          </button>
        </div>
      </div>

      {/* Список оборудования */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center text-xs font-bold text-slate-700">
          <span>Список инвентаря ({equipment.length})</span>
          <span>Статус / У кого находится</span>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-[10px] uppercase font-bold text-slate-400">
              <tr>
                <th className="p-3.5 pl-5">Название техники</th>
                <th className="p-3.5">Категория</th>
                <th className="p-3.5">Статус</th>
                <th className="p-3.5">Ответственный / Держатель</th>
                <th className="p-3.5 text-right pr-5">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Загрузка склада...</td>
                </tr>
              ) : equipment.length > 0 ? (
                equipment.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 pl-5 font-bold text-slate-900">{item.name}</td>
                    <td className="p-3.5 text-slate-600 font-medium">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {item.status === 'IN_STOCK' && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                          📦 На складе
                        </span>
                      )}
                      {item.status === 'ISSUED' && (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                          🚀 Выдано
                        </span>
                      )}
                      {item.status === 'REPAIR' && (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                          🛠️ В ремонте
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <select
                        value={item.holderId || ''}
                        onChange={(e) => {
                          const cleanerId = e.target.value ? Number(e.target.value) : null;
                          const newStatus = cleanerId ? 'ISSUED' : 'IN_STOCK';
                          handleUpdateStatus(item.id, newStatus, cleanerId);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                      >
                        <option value="">🏠 На базе (Склад)</option>
                        {cleaners.map((c) => (
                          <option key={c.id} value={c.id}>
                            👤 Клинер: {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3.5 text-right pr-5 space-x-2">
                      {item.status !== 'REPAIR' ? (
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'REPAIR', null)}
                          className="text-amber-600 hover:text-amber-800 font-semibold text-[11px] bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 transition"
                        >
                          В ремонт
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'IN_STOCK', null)}
                          className="text-emerald-600 hover:text-emerald-800 font-semibold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
                        >
                          Вернуть на склад
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-300 hover:text-rose-600 font-bold px-1 transition text-sm"
                        title="Удалить"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Склад пуст. Нажмите кнопку «Загрузить стартовый набор», чтобы добавить оборудование.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модалка добавления единицы техники */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">➕ Новая единица оборудования</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Название техники *</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Пылесос Kärcher WD3"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Категория</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  <option value="HEAVY">Тяжелое оборудование (Строительный пылесос)</option>
                  <option value="CLEANING">Химчистка (Моющий пылесос)</option>
                  <option value="SMALL_VACUUM">Маленький пылесос</option>
                  <option value="LADDER">Стремянка</option>
                  <option value="STEAMER">Пароочиститель</option>
                  <option value="EQUIPMENT">Прочее оборудование</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Примечание</label>
                <input
                  type="text"
                  placeholder="Инвентарный номер, состояние..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition shadow-xs"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
