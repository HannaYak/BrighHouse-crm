"use client";
import React, { useState, useEffect } from 'react';

interface AddOn {
  id?: number;
  code: string;
  title: string;
  price: number;
  durationMins: number;
  unit: string;
}

// Дефолтные услуги, если база пустая
const DEFAULT_ADDONS = [
  { code: 'oven', title: 'Духовка', price: 45, durationMins: 30, unit: 'шт' },
  { code: 'fridge', title: 'Холодильник (внутри)', price: 35, durationMins: 30, unit: 'шт' },
  { code: 'fridgeFreeze', title: 'Холодильник + Морозилка', price: 50, durationMins: 45, unit: 'шт' },
  { code: 'microwave', title: 'Микроволновка', price: 20, durationMins: 15, unit: 'шт' },
  { code: 'balcony', title: 'Балкон', price: 35, durationMins: 30, unit: 'шт' },
  { code: 'kitchenClosets', title: 'Кухонные шкафчики (внутри)', price: 100, durationMins: 60, unit: 'шт' },
  { code: 'vacuum', title: 'Пылесос исполнителя', price: 30, durationMins: 0, unit: 'шт' },
];

export default function SettingsPage() {
  const [addons, setAddons] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/addons');
      if (res.ok) {
        const data = await res.json();
        // Если в базе пусто, подставляем дефолтные для первичной инициализации
        setAddons(data.length > 0 ? data : DEFAULT_ADDONS);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (index: number, field: keyof AddOn, value: string | number) => {
    const updated = [...addons];
    updated[index] = { ...updated[index], [field]: value };
    setAddons(updated);
  };

  const handleSave = async (addon: AddOn) => {
    setSavingCode(addon.code);
    try {
      await fetch('/api/settings/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addon),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSavingCode(null);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">⚙️ Настройки системы</h1>
          <p className="text-xs text-slate-500">Управление ценами, тарифами и доп. услугами</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-800">Дополнительные услуги (Прайс-лист)</h2>
        </div>
        
        {loading ? (
          <div className="text-center py-10 text-slate-400 text-xs">Загрузка прайс-листа...</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Услуга</th>
                <th className="p-3.5 w-32">Цена (zł)</th>
                <th className="p-3.5 w-32">Время (мин)</th>
                <th className="p-3.5 w-24">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {addons.map((addon, idx) => (
                <tr key={addon.code} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 font-bold text-slate-800">
                    <input
                      type="text"
                      value={addon.title}
                      onChange={(e) => handleChange(idx, 'title', e.target.value)}
                      className="w-full bg-transparent border-none p-0 focus:ring-0 font-bold text-slate-800"
                    />
                    <div className="text-[9px] font-mono text-slate-400 uppercase mt-0.5">{addon.code}</div>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition">
                      <input
                        type="number"
                        value={addon.price}
                        onChange={(e) => handleChange(idx, 'price', Number(e.target.value))}
                        className="w-full bg-transparent border-none p-0 text-sm font-extrabold text-slate-900 focus:ring-0"
                      />
                      <span className="text-slate-400 font-bold">zł</span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition">
                      <input
                        type="number"
                        value={addon.durationMins}
                        onChange={(e) => handleChange(idx, 'durationMins', Number(e.target.value))}
                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0"
                      />
                      <span className="text-slate-400">мин</span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <button
                      onClick={() => handleSave(addon)}
                      disabled={savingCode === addon.code}
                      className="bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold px-3 py-1.5 rounded-lg transition text-[11px] w-full"
                    >
                      {savingCode === addon.code ? '⏳...' : 'Сохранить'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
