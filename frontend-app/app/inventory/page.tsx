"use client";
import React, { useState, useEffect } from 'react';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Форма добавления
  const [name, setName] = useState('');
  const [category, setCategory] = useState('CHEMISTRY');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('шт');
  const [minQuantity, setMinQuantity] = useState('2');
  const [costPrice, setCostPrice] = useState('');

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          quantity: parseFloat(quantity) || 0,
          unit,
          minQuantity: parseFloat(minQuantity) || 2,
          costPrice: parseFloat(costPrice) || 0,
        }),
      });

      if (res.ok) {
        setName('');
        setQuantity('');
        setCostPrice('');
        fetchInventory();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateQuantity = async (id: string, currentQty: number, delta: number) => {
    const newQty = Math.max(0, currentQty + delta);
    try {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantity: newQty }),
      });
      if (res.ok) fetchInventory();
    } catch (e) {
      console.error(e);
    }
  };

  const categoryLabels: Record<string, string> = {
    CHEMISTRY: '🧪 Химия',
    CONSUMABLE: '🧽 Расходники',
    EQUIPMENT: '🔌 Оборудование',
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">📦 Склад и учет расходных материалов</h1>
        <p className="text-xs text-slate-500">Контроль остатков химии, инвентаря и оборудования</p>
      </div>

      {/* Форма добавления нового средства/инвентаря */}
      <form onSubmit={handleAddItem} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">➕ Добавить позицию на склад</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Название (напр. Kiehl Clarida Eco)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
              required
            />
          </div>
          <div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
            >
              <option value="CHEMISTRY">🧪 Химия</option>
              <option value="CONSUMABLE">🧽 Расходники</option>
              <option value="EQUIPMENT">🔌 Оборудование</option>
            </select>
          </div>
          <div>
            <input
              type="number"
              step="0.5"
              placeholder="Кол-во"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
            />
          </div>
          <div>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
            >
              <option value="шт">шт</option>
              <option value="л">л</option>
              <option value="упак">упак</option>
            </select>
          </div>
          <div>
            <input
              type="number"
              step="0.1"
              placeholder="Цена (zł)"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
            />
          </div>
        </div>
        <button
          type="submit"
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-sm"
        >
          Сохранить на склад
        </button>
      </form>

      {/* Список складских остатков */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">Остатки на складе</h2>
        </div>

        {loading ? (
          <div className="text-center py-10 text-xs text-slate-400">Загрузка склада...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">Склад пока пуст. Добавьте первую позицию выше.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const isLow = item.quantity <= item.minQuantity;
              return (
                <div key={item.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{item.name}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                        {categoryLabels[item.category] || item.category}
                      </span>
                      {isLow && (
                        <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-md font-bold">
                          ⚠️ Заканчивается!
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Закупка: <b>{item.costPrice} zł</b> / {item.unit} • Мин. запас: {item.minQuantity} {item.unit}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-800">
                      {item.quantity} {item.unit}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity, -1)}
                        className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                      >
                        -
                      </button>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity, 1)}
                        className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
