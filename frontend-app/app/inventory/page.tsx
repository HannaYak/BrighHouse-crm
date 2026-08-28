"use client";
import React, { useState, useEffect } from 'react';

interface InventoryItem {
  id: string;
  name: string;
  category: 'CHEMISTRY' | 'CONSUMABLE' | 'EQUIPMENT' | 'UNIFORM';
  quantity: number;
  minQuantity: number;
  unit: string;
  location: string;
  assignedTo?: string | null;
  notes?: string | null;
}

const CATEGORY_NAMES = {
  CHEMISTRY: '🧪 Профессиональная химия',
  CONSUMABLE: '🧽 Расходники и салфетки',
  EQUIPMENT: '⚡ Оборудование и техника',
  UNIFORM: '👕 Униформа и инвентарь',
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Форма добавления
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'CHEMISTRY' | 'CONSUMABLE' | 'EQUIPMENT' | 'UNIFORM'>('CHEMISTRY');
  const [quantity, setQuantity] = useState(10);
  const [minQuantity, setMinQuantity] = useState(5);
  const [unit, setUnit] = useState('шт');
  const [assignedTo, setAssignedTo] = useState('');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory');
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, quantity, minQuantity, unit, assignedTo }),
      });

      if (res.ok) {
        setIsAdding(false);
        setName('');
        setAssignedTo('');
        fetchItems();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateQuantity = async (id: string, delta: number) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantityChange: delta }),
      });
      if (res.ok) fetchItems();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить позицию со склада?')) return;
    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchItems();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredItems = items.filter(
    item => activeTab === 'ALL' || item.category === activeTab
  );

  const lowStockCount = items.filter(i => i.quantity <= i.minQuantity).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Шапка склада */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            📦 Склад инвентаря и химии
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Контроль остатков расходников, учет оборудования и выданной техники
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl">
              ⚠️ Заканчивается: {lowStockCount} поз.
            </span>
          )}
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs"
          >
            {isAdding ? '✕ Закрыть' : '+ Добавить позицию'}
          </button>
        </div>
      </div>

      {/* Форма добавления позиции */}
      {isAdding && (
        <form onSubmit={handleAddItem} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Новая позиция на складе</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Название *</label>
              <input
                type="text"
                placeholder="напр. Kiehl Torvan 1L"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Категория</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option value="CHEMISTRY">🧪 Химия</option>
                <option value="CONSUMABLE">🧽 Расходники</option>
                <option value="EQUIPMENT">⚡ Техника / Оборудование</option>
                <option value="UNIFORM">👕 Униформа</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Кол-во</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Ед. изм.</label>
                <input
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Выдано клинеру (если применимо)</label>
              <input
                type="text"
                placeholder="напр. Анна К."
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition"
            >
              ✓ Сохранить
            </button>
          </div>
        </form>
      )}

      {/* Фильтр по категориям */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'
          }`}
        >
          Все ({items.length})
        </button>
        {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === key ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Таблица склада */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="p-4">Наименование</th>
              <th className="p-4">Категория</th>
              <th className="p-4 text-center">Остаток</th>
              <th className="p-4">Закреплено / Локация</th>
              <th className="p-4 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map(item => {
              const isLow = item.quantity <= item.minQuantity;
              return (
                <tr key={item.id} className="hover:bg-slate-50/60 transition">
                  <td className="p-4">
                    <span className="font-extrabold text-slate-900 block">{item.name}</span>
                    {isLow && (
                      <span className="text-[10px] font-bold text-amber-600">
                        ⚠️ Заканчивается (порог: {item.minQuantity} {item.unit})
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-slate-600 font-medium">
                    {CATEGORY_NAMES[item.category] || item.category}
                  </td>
                  <td className="p-4 text-center">
                    <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="w-5 h-5 bg-white border rounded text-xs font-bold hover:bg-slate-100"
                      >
                        -
                      </button>
                      <span className={`font-extrabold px-1.5 ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                        {item.quantity} {item.unit}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="w-5 h-5 bg-white border rounded text-xs font-bold hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    {item.assignedTo ? (
                      <span className="text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                        👤 {item.assignedTo}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">📍 {item.location || 'Главный склад'}</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-400 hover:text-rose-600 text-xs transition p-1"
                      title="Удалить"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400 text-xs">
                  {loading ? 'Загрузка склада...' : 'В этой категории позиций пока нет.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
