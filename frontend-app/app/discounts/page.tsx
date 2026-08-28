"use client";
import React, { useState, useEffect } from 'react';

export default function DiscountsPage() {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Форма добавления
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [value, setValue] = useState<number | ''>(10);
  const [minOrderSum, setMinOrderSum] = useState<number | ''>(100);
  const [maxUses, setMaxUses] = useState<number | ''>('');
  const [expiresAt, setExpiresAt] = useState('');

  const loadPromos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/discounts');
      if (res.ok) {
        setPromos(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromos();
  }, []);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !value) return;

    try {
      const res = await fetch('/api/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          description,
          discountType,
          value,
          minOrderSum: minOrderSum || 0,
          maxUses: maxUses || null,
          expiresAt: expiresAt || null,
        }),
      });

      if (res.ok) {
        setCode('');
        setDescription('');
        setValue(10);
        setMinOrderSum(100);
        setMaxUses('');
        setExpiresAt('');
        loadPromos();
      } else {
        const err = await res.json();
        alert(err.error || 'Ошибка создания');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка соединения');
    }
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await fetch('/api/discounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });
      loadPromos();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500 text-xs">Загрузка скидок...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-xl font-bold text-slate-900">🏷 Промокоды и система лояльности</h1>
        <p className="text-xs text-slate-500">Управление скидками на первый заказ, сезонными акциями и регулярными подписками</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Форма создания промокода */}
        <form onSubmit={handleCreatePromo} className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">➕ Создать новый промокод</h2>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Код купона</label>
            <input
              type="text"
              placeholder="Например: WELCOME15"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold uppercase tracking-wider text-brand-700"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Тип скидки</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700"
              >
                <option value="PERCENT">% Процент</option>
                <option value="FIXED">zł Фикс. сумма</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Размер ({discountType === 'PERCENT' ? '%' : 'zł'})</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Мин. сумма заказа (zł)</label>
              <input
                type="number"
                placeholder="0"
                value={minOrderSum}
                onChange={(e) => setMinOrderSum(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Лимит активаций</label>
              <input
                type="number"
                placeholder="Безлимит"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Срок действия (необязательно)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Описание / Для кого</label>
            <input
              type="text"
              placeholder="Скидка на первую генеральную уборку"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm"
          >
            Создать промокод
          </button>
        </form>

        {/* Список действующих промокодов */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Действующие акции ({promos.length})
            </h2>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
            {promos.map((promo) => (
              <div key={promo.id} className="p-4 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-lg tracking-wider">
                      {promo.code}
                    </span>
                    <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {promo.discountType === 'PERCENT' ? `-${promo.value}%` : `-${promo.value} zł`}
                    </span>
                    {!promo.isActive && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold">
                        Отключен
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1.5">{promo.description || 'Без описания'}</p>

                  <div className="text-[10px] text-slate-400 mt-1 flex gap-3">
                    <span>Мин. заказ: <b>{promo.minOrderSum || 0} zł</b></span>
                    <span>Использовано: <b>{promo.usedCount}{promo.maxUses ? ` / ${promo.maxUses}` : ''}</b></span>
                  </div>
                </div>

                <button
                  onClick={() => toggleStatus(promo.id, promo.isActive)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                    promo.isActive
                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  }`}
                >
                  {promo.isActive ? 'Отключить' : 'Включить'}
                </button>
              </div>
            ))}

            {promos.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">Промокоды еще не созданы.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
