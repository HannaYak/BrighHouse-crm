"use client";
import React, { useState, useEffect } from 'react';

const CATEGORY_NAMES: Record<string, string> = {
  CHEMISTRY: '🧪 Химия',
  CONSUMABLE: '🧽 Расходники',
  EQUIPMENT: '⚡ Техника',
  UNIFORM: '👕 Форма',
};

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Поля для добавления
  const [name, setName] = useState('');
  const [category, setCategory] = useState('CHEMISTRY');
  const [quantity, setQuantity] = useState(10);
  const [minQuantity, setMinQuantity] = useState(5);
  const [unit, setUnit] = useState('шт');
  const [location, setLocation] = useState('Главный склад');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');

  const loadItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Изменение остатка (+1 / -1) через существующий PATCH
  const handleQuantityChange = async (id: string, delta: number) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantityChange: delta }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, quantity: Math.max(0, item.quantity + delta) }
              : item
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Удаление позиции через существующий DELETE
  const handleDelete = async (id: string, itemName: string) => {
    if (!window.confirm(`Удалить позицию "${itemName}" со склада?`)) return;
    try {
      const res = await fetch(`/api/inventory?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Создание позиции через существующий POST
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          quantity,
          minQuantity,
          unit,
          location,
          assignedTo: assignedTo.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (res.ok) {
        setName('');
        setAssignedTo('');
        setNotes('');
        setQuantity(10);
        loadItems();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredItems = items.filter((it) => {
    if (selectedCategory === 'ALL') return true;
    return it.category === selectedCategory;
  });

  const lowStockItems = items.filter((it) => it.quantity <= it.minQuantity);

  if (loading) {
    return <div className="p-10 text-center text-xs text-slate-500">Загрузка склада...</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📦 Складской учет и инвентарь</h1>
          <p className="text-xs text-slate-500">
            Остатки химии, расходников и выданной техники
          </p>
        </div>

        {/* Фильтры категорий */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 flex-wrap gap-1">
          {['ALL', 'CHEMISTRY', 'CONSUMABLE', 'EQUIPMENT', 'UNIFORM'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                selectedCategory === cat
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat === 'ALL' ? 'Все' : CATEGORY_NAMES[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Предупреждение о низких остатках */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⚠️</span>
            <div>
              <div className="text-xs font-bold text-amber-900">Заканчиваются запасы:</div>
              <div className="text-[11px] text-amber-800">
                {lowStockItems.map((i) => `${i.name} (осталось ${i.quantity} ${i.unit})`).join(', ')}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg">
            Пора докупить ({lowStockItems.length})
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Таблица остатков */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5 pl-5">Позиция</th>
                <th className="p-3.5">Категория</th>
                <th className="p-3.5 text-center">Остаток</th>
                <th className="p-3.5">Локация / На руках</th>
                <th className="p-3.5 text-right pr-5">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    В этой категории пока нет позиций
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.quantity <= item.minQuantity;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 pl-5">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        {item.notes && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {CATEGORY_NAMES[item.category] || item.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-extrabold text-sm">
                        <span className={isLow ? 'text-rose-600' : 'text-slate-800'}>
                          {item.quantity} {item.unit}
                        </span>
                        <div className="text-[9px] font-normal text-slate-400">порог: {item.minQuantity}</div>
                      </td>
                      <td className="p-3.5 text-slate-600 text-[11px]">
                        <div>📍 {item.location || 'Склад'}</div>
                        {item.assignedTo && (
                          <div className="font-bold text-indigo-600 mt-0.5">
                            🙋‍♀️ {item.assignedTo}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-right pr-5">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, -1)}
                            className="w-7 h-7 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-700 rounded-lg font-bold text-sm transition flex items-center justify-center"
                            title="Списать 1 ед."
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, 1)}
                            className="w-7 h-7 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 rounded-lg font-bold text-sm transition flex items-center justify-center"
                            title="Добавить 1 ед."
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.name)}
                            className="w-7 h-7 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg text-xs transition flex items-center justify-center ml-1"
                            title="Удалить позицию"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Форма добавления */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs space-y-4 h-fit">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            ➕ Добавить позицию на склад
          </h3>
          <form onSubmit={handleCreateItem} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Название
              </label>
              <input
                type="text"
                placeholder="Kärcher Puzzi, Kiehl Clarida..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Категория</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                >
                  <option value="CHEMISTRY">Химия</option>
                  <option value="CONSUMABLE">Расходники</option>
                  <option value="EQUIPMENT">Оборудование / Техника</option>
                  <option value="UNIFORM">Форма</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ед. изм.</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                >
                  <option value="шт">шт</option>
                  <option value="л">литры</option>
                  <option value="уп">упаковки</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Количество</label>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Мин. порог</label>
                <input
                  type="number"
                  min="1"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Где хранится (локация)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Закрепить за клинером (если на руках)
              </label>
              <input
                type="text"
                placeholder="Имя сотрудника..."
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Заметка
              </label>
              <input
                type="text"
                placeholder="Инв. номер, состояние..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs transition shadow-xs"
            >
              Сохранить позицию
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
