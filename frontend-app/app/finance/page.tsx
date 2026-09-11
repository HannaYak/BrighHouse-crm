"use client";
import React, { useState, useEffect } from 'react';

const PAYMENT_METHODS_MAP: Record<string, string> = {
  ALL: 'Все способы оплаты',
  CASH: '💵 Наличные',
  BIZ_CARD: '🏢 Карта Бизнес',
  SILA_CARD: '💳 Карта Силы',
  REVOLUT: '⚡ Revolut',
  PAYPAL: '🅿️ PayPal',
  MOMS_CARD: '👩 Карта мамы',
  DADS_CARD: '👨 Карта бати',
  STRIPE: '🌐 Stripe',
  OTHER: '🔄 Другое',
};

const EXPENSE_CATEGORIES = [
  'Сдача налички клинером',
  'Зарплата клинеру',
  'Аванс клинеру',
  'Химия и инвентарь',
  'Маркетинг и реклама',
  'Дивиденды владельцам',
  'Резервный фонд',
  'Транспорт и бензин',
  'Ремонт оборудования',
  'Аренда склада / офиса',
  'Связь и софт',
  'Прочее',
];

export default function FinancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('ALL');

  const [cleanersList, setCleanersList] = useState<{ id: number; name: string }[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [form, setForm] = useState({
    type: 'EXPENSE',
    category: EXPENSE_CATEGORIES[0],
    customCategory: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    cleanerId: '',
    comment: '',
  });
  const [savingExpense, setSavingExpense] = useState(false);

  const fetchCleaners = async () => {
    try {
      const res = await fetch('/api/cleaners');
      if (res.ok) setCleanersList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFinance = async () => {
    try {
      setLoading(true);
      const url = `/api/finances?startDate=${startDate}&endDate=${endDate}&paymentMethod=${selectedPaymentMethod}`;
      const res = await fetch(url);
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCleaners();
  }, []);

  useEffect(() => {
    fetchFinance();
  }, [startDate, endDate, selectedPaymentMethod]);

  const setQuickRange = (type: 'today' | 'week' | 'month') => {
    const now = new Date();
    if (type === 'today') {
      const d = now.toISOString().slice(0, 10);
      setStartDate(d);
      setEndDate(d);
    } else if (type === 'week') {
      const day = now.getDay() || 7;
      const mon = new Date(now);
      mon.setDate(now.getDate() - day + 1);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      setStartDate(mon.toISOString().slice(0, 10));
      setEndDate(sun.toISOString().slice(0, 10));
    } else if (type === 'month') {
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      alert('Укажите корректную сумму');
      return;
    }

    const finalCategory = isCustomCategory ? form.customCategory.trim() : form.category;
    if (!finalCategory) {
      alert('Укажите категорию');
      return;
    }

    setSavingExpense(true);
    try {
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          category: finalCategory,
          amount: Number(form.amount),
          date: form.date,
          comment: form.comment,
          cleanerId: form.cleanerId || null,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setForm({
          type: 'EXPENSE',
          category: EXPENSE_CATEGORIES[0],
          customCategory: '',
          amount: '',
          date: new Date().toISOString().slice(0, 10),
          cleanerId: '',
          comment: '',
        });
        setIsCustomCategory(false);
        fetchFinance();
      } else {
        alert('Ошибка при сохранении');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка соединения');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Удалить эту финансовую запись?')) return;
    try {
      const res = await fetch(`/api/finances?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchFinance();
    } catch (e) {
      console.error(e);
    }
  };

  const openCashReturnModal = (staff: any) => {
    const debt = staff.currentCashOnHand > 0 ? staff.currentCashOnHand : Math.abs(staff.balance);
    setForm({
      type: 'INCOME',
      category: 'Сдача налички клинером',
      customCategory: '',
      amount: String(debt),
      date: new Date().toISOString().slice(0, 10),
      cleanerId: String(staff.id),
      comment: `${staff.roleTitle || 'Сотрудник'} ${staff.name} вернул(а) наличные в кассу`,
    });
    setIsModalOpen(true);
  };

  const s = data?.summary || {};
  const pb = data?.paymentBreakdown || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Шапка и фильтры */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              📊 Финансы, Касса и P&L
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Раздельный учет клинеров (30/35 zł/ч) и мастеров химчистки/окон (40% сдельно)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 gap-1">
              <button onClick={() => setQuickRange('today')} className="px-2.5 py-1 hover:bg-white rounded-lg transition">
                Сегодня
              </button>
              <button onClick={() => setQuickRange('week')} className="px-2.5 py-1 hover:bg-white rounded-lg transition">
                Неделя
              </button>
              <button onClick={() => setQuickRange('month')} className="px-2.5 py-1 hover:bg-white rounded-lg transition">
                Месяц
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded-xl text-xs font-semibold">
              <span className="text-slate-400 pl-1">С:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800"
              />
              <span className="text-slate-400">ПО:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800"
              />
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              ➕ Добавить операцию
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500">Фильтр по счёту / кассе:</span>
          <select
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
          >
            {Object.entries(PAYMENT_METHODS_MAP).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Мультикасса */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          🏦 Фактические поступления по счетам и кошелькам
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
          {Object.entries(PAYMENT_METHODS_MAP)
            .filter(([k]) => k !== 'ALL')
            .map(([key, label]) => (
              <div key={key} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 truncate">{label}</div>
                <div className="text-sm font-extrabold text-slate-900 mt-1">
                  {pb[key] || 0} zł
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Карточки KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Выручка (Оборот)
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {loading ? '...' : `${s.totalRevenue || 0} zł`}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {s.completedCount || 0} закрытых заказов
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
            ФОТ персонала
          </span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {loading ? '...' : `${s.totalCleanersAccrued || 0} zł`}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Клинеры + Мастера</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
            Расходы (OPEX)
          </span>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">
            {loading ? '...' : `${s.opexExpenses || 0} zł`}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Химия, реклама, прочее</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
            Чистая прибыль
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">
            {loading ? '...' : `${s.netProfit || 0} zł`}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Итог компании</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
            Маржинальность
          </span>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">
            {loading ? '...' : `${s.marginPercent || 0}%`}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Рентабельность оборота</span>
        </div>
      </div>

      {/* Ведомости персонала */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* БЛОК 1: Клинеры (почасовая) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              👩‍🌾 Клинеры (Почасовая 30/35 zł/ч)
            </h2>
            <span className="text-[11px] text-slate-500 font-semibold">
              {data?.cleanerStats?.length || 0} чел.
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[380px]">
            {data?.cleanerStats && data.cleanerStats.length > 0 ? (
              data.cleanerStats.map((c: any) => (
                <div key={c.id} className="p-4 hover:bg-slate-50 transition flex justify-between items-start text-xs">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Уборок: <b>{c.completedCount}</b> • Отработано: <b>{c.totalHours} ч</b>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Выручка: <b>{c.generatedRevenue} zł</b>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-xs font-bold text-slate-800">
                      Начислено: <span className="text-amber-600">{c.totalAccrued} zł</span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      На руках нал: <span className="font-semibold text-slate-800">{c.currentCashOnHand || 0} zł</span>
                    </div>

                    <div className="text-xs font-extrabold flex items-center justify-end gap-1.5 pt-0.5">
                      {c.balance >= 0 ? (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          К выплате: {c.balance} zł
                        </span>
                      ) : (
                        <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                          ⚠️ Долг в кассу: {Math.abs(c.balance)} zł
                        </span>
                      )}
                    </div>

                    {(c.currentCashOnHand > 0 || c.balance < 0) && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => openCashReturnModal(c)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[10px] transition shadow-2xs"
                        >
                          💵 Принять нал
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                Нет закрытых смен клинеров
              </div>
            )}
          </div>
        </div>

        {/* БЛОК 2: Мастера химчистки и окон (40%) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-indigo-100 bg-indigo-50/50 flex justify-between items-center">
            <h2 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
              🛋️ Мастера химчистки и окон (40% сдельно)
            </h2>
            <span className="text-[11px] text-indigo-600 font-semibold">
              {data?.masterStats?.length || 0} спец.
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[380px]">
            {data?.masterStats && data.masterStats.length > 0 ? (
              data.masterStats.map((m: any) => (
                <div key={m.id} className="p-4 hover:bg-indigo-50/30 transition flex justify-between items-start text-xs">
                  <div>
                    <div className="font-bold text-indigo-950 text-sm flex items-center gap-1.5">
                      <span>🛠️ {m.name}</span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                        Мастер 40%
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Выездов: <b>{m.completedCount}</b>
                    </div>
                    <div className="text-[11px] text-indigo-600 mt-0.5">
                      Объем химчистки/окон: <b>{m.generatedRevenue} zł</b>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-xs font-bold text-slate-800">
                      Ставка (40%): <span className="text-indigo-600 font-extrabold">{m.totalAccrued} zł</span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      На руках нал: <span className="font-semibold text-slate-800">{m.currentCashOnHand || 0} zł</span>
                    </div>

                    <div className="text-xs font-extrabold flex items-center justify-end gap-1.5 pt-0.5">
                      {m.balance >= 0 ? (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          К выплате: {m.balance} zł
                        </span>
                      ) : (
                        <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                          ⚠️ Долг в кассу: {Math.abs(m.balance)} zł
                        </span>
                      )}
                    </div>

                    {(m.currentCashOnHand > 0 || m.balance < 0) && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => openCashReturnModal(m)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[10px] transition shadow-2xs"
                        >
                          💵 Принять нал
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                Нет данных по мастерам. Укажите клинеру тег <code className="bg-slate-100 px-1 py-0.5 rounded">мастер_химчистки</code> в карточке сотрудника.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Журнал расходов и доходов */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            🧾 Журнал операций, расходов и возвратов налички
          </h2>
          <span className="text-[11px] text-slate-500 font-semibold">
            Записей: {data?.expenses?.length || 0}
          </span>
        </div>

        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[380px]">
          {data?.expenses && data.expenses.length > 0 ? (
            data.expenses.map((e: any) => (
              <div key={e.id} className="p-4 hover:bg-slate-50 transition flex justify-between items-start text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        e.type === 'INCOME'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {e.category}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(e.date).toLocaleDateString('ru-RU')}
                    </span>
                    {e.cleaner && (
                      <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                        👤 {e.cleaner.name}
                      </span>
                    )}
                  </div>

                  {e.comment && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-sm">
                      💬 {e.comment}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-extrabold text-sm ${
                      e.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-900'
                    }`}
                  >
                    {e.type === 'INCOME' ? '+' : '-'}
                    {e.amount} zł
                  </span>
                  <button
                    onClick={() => handleDeleteExpense(e.id)}
                    className="text-slate-300 hover:text-rose-600 font-bold text-sm px-1 transition"
                    title="Удалить запись"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              Записей о расходах пока нет
            </div>
          )}
        </div>
      </div>

      {/* Модалка добавления финансовой операции */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">➕ Финансовая операция / Прием налички</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl font-bold">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'EXPENSE' })}
                  className={`py-1.5 rounded-lg transition ${
                    form.type === 'EXPENSE' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  🔴 Расход компании
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'INCOME' })}
                  className={`py-1.5 rounded-lg transition ${
                    form.type === 'INCOME' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  🟢 Прием налички в кассу
                </button>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-500 uppercase text-[10px]">Категория</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(!isCustomCategory)}
                    className="text-blue-600 font-bold text-[10px] hover:underline"
                  >
                    {isCustomCategory ? '← Выбрать из списка' : '+ Своя категория'}
                  </button>
                </div>

                {isCustomCategory ? (
                  <input
                    type="text"
                    required
                    placeholder="Например: Закупка салфеток..."
                    value={form.customCategory}
                    onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                ) : (
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                    Сумма (zł) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-extrabold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                    Дата операции
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                  Сотрудник (клинер или мастер)
                </label>
                <select
                  value={form.cleanerId}
                  onChange={(e) => setForm({ ...form, cleanerId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="">Без привязки (общекорпоративный расход)</option>
                  {cleanersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                  Комментарий / Куда поступили деньги
                </label>
                <textarea
                  rows={2}
                  placeholder="Сдал в сейф / перевел на карту..."
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none"
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
                  disabled={savingExpense}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition shadow-xs"
                >
                  {savingExpense ? 'Сохранение...' : 'Зафиксировать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
