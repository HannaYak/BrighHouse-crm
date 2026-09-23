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

// Все статьи для ручного ввода
const EXPENSE_CATEGORIES = [
  'Сдача налички клинером',
  'Выплата Ханне',
  'Выплата Админу',
  'Химчистка 1',
  'Химчистка 2 (мастер 90%)',
  'Зарплата клинерам',
  'Аванс клинеру',
  'Реклама и маркетинг',
  'Резервный фонд',
  'Налоги',
  'Абонементы',
  'Химия и инвентарь',
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

  // Быстрый вызов модалки под конкретную статью
  const openManualEntryModal = (categoryName: string) => {
    setForm({
      type: 'EXPENSE',
      category: categoryName,
      customCategory: '',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      cleanerId: '',
      comment: '',
    });
    setIsCustomCategory(false);
    setIsModalOpen(true);
  };

  const s = data?.summary || {};
  const pb = data?.paymentBreakdown || {};
  const expensesList: any[] = data?.expenses || [];

  // Подсчёт фактически внесённых вручную расходов
  const getCategoryTotal = (catName: string) => {
    return expensesList
      .filter((e) => e.type === 'EXPENSE' && e.category === catName)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  };

  const totalRevenue = Number(s.totalRevenue || 0);
  const totalStaffPayroll = Number(s.totalCleanersAccrued || 0);
  const totalOpex = Number(s.opexExpenses || 0);
  const cashRemaining = totalRevenue - totalStaffPayroll - totalOpex;

  const paidHanna = getCategoryTotal('Выплата Ханне');
  const paidAdmin = getCategoryTotal('Выплата Админу');
  const paidDry1 = getCategoryTotal('Химчистка 1');
  const paidDry2 = getCategoryTotal('Химчистка 2 (мастер 90%)');
  const paidAds = getCategoryTotal('Реклама и маркетинг');
  const paidReserve = getCategoryTotal('Резервный фонд');
  const paidTaxes = getCategoryTotal('Налоги');
  const paidSubs = getCategoryTotal('Абонементы');

  const exportFinanceCSV = () => {
    const summaryRows = [
      ['ПОКАЗАТЕЛЬ', 'ЗНАЧЕНИЕ (zł)'],
      ['Общая выручка (Оборот)', totalRevenue.toFixed(2)],
      ['Начислено клинерам (ФОТ)', totalStaffPayroll.toFixed(2)],
      ['Все внесённые расходы (OPEX)', totalOpex.toFixed(2)],
      ['Текущий остаток в кассе компании', cashRemaining.toFixed(2)],
      ['', ''],
      ['СТАТЬИ ВЫПЛАТ И РАСХОДОВ (ВНЕСЕНО ВРУЧНУЮ)', 'СУММА (zł)'],
      ['Выплата Ханне', paidHanna.toFixed(2)],
      ['Выплата Админу', paidAdmin.toFixed(2)],
      ['Химчистка 1', paidDry1.toFixed(2)],
      ['Химчистка 2 (мастер 90%)', paidDry2.toFixed(2)],
      ['Реклама и маркетинг', paidAds.toFixed(2)],
      ['Резервный фонд', paidReserve.toFixed(2)],
      ['Налоги', paidTaxes.toFixed(2)],
      ['Абонементы', paidSubs.toFixed(2)],
      ['', ''],
      ['ЖУРНАЛ ОПЕРАЦИЙ', '', '', '', ''],
      ['Дата', 'Тип', 'Категория', 'Сотрудник', 'Сумма (zł)', 'Комментарий']
    ];

    const expenseRows = expensesList.map((e: any) => [
      new Date(e.date).toLocaleDateString('ru-RU'),
      e.type === 'INCOME' ? 'ДОХОД' : 'РАСХОД',
      `"${e.category || ''}"`,
      `"${e.cleaner?.name || 'Общий'}"`,
      e.amount,
      `"${(e.comment || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      ...summaryRows.map(r => r.join(';')),
      ...expenseRows.map(r => r.join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BrightHouse_Финансы_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Шапка и фильтры */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              📊 Финансы и касса компании
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Учёт приходов по кассам, зарплат клинеров и ручных выплат в конце месяца
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
              onClick={exportFinanceCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              📥 Экспорт (CSV)
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
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

      {/* Поступления по кассам */}
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

      {/* Основные показатели */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Выручка (Оборот)
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {loading ? '...' : `${totalRevenue} zł`}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {s.completedCount || 0} выполненных заказов
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
            ФОТ клинеров
          </span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {loading ? '...' : `${totalStaffPayroll} zł`}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Начислено по сменам</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
            Расходы и выплаты (OPEX)
          </span>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">
            {loading ? '...' : `${totalOpex} zł`}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Все внесённые суммы</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
            Остаток в кассе компании
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">
            {loading ? '...' : `${cashRemaining.toFixed(0)} zł`}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Фактический свободный остаток</span>
        </div>
      </div>

      {/* Панель ручных выплат и закрытия месяца */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900">
            💼 Выдача ЗП, закрытие месяца и статьи расходов
          </h2>
          <p className="text-[11px] text-slate-500">
            Нажмите на нужную карточку, чтобы вручную вписать сумму выплаты
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Ханна */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-700 block">👑 Ханна</span>
              <div className="text-base font-black text-slate-900 mt-1 font-mono">{paidHanna} zł</div>
            </div>
            <button
              type="button"
              onClick={() => openManualEntryModal('Выплата Ханне')}
              className="mt-2 w-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-bold py-1 px-1 rounded-lg transition"
            >
              + Внести ЗП
            </button>
          </div>

          {/* Админ */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-700 block">🧑‍💼 Админ</span>
              <div className="text-base font-black text-slate-900 mt-1 font-mono">{paidAdmin} zł</div>
            </div>
            <button
              type="button"
              onClick={() => openManualEntryModal('Выплата Админу')}
              className="mt-2 w-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-bold py-1 px-1 rounded-lg transition"
            >
              + Внести ЗП
            </button>
          </div>

          {/* Химчистка 1 */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-700 block">🛋️ Химчистка 1</span>
              <div className="text-base font-black text-slate-900 mt-1 font-mono">{paidDry1} zł</div>
            </div>
            <button
              type="button"
              onClick={() => openManualEntryModal('Химчистка 1')}
              className="mt-2 w-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-bold py-1 px-1 rounded-lg transition"
            >
              + Внести ЗП
            </button>
          </div>

          {/* Химчистка 2 */}
          <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-indigo-950 block">🛋️ Химчистка 2</span>
              <span className="text-[9px] text-indigo-600 block">Мастер (90%)</span>
              <div className="text-base font-black text-indigo-900 mt-0.5 font-mono">{paidDry2} zł</div>
            </div>
            <button
              type="button"
              onClick={() => openManualEntryModal('Химчистка 2 (мастер 90%)')}
              className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold py-1 px-1 rounded-lg transition"
            >
              + Внести 90%
            </button>
          </div>

          {/* Реклама */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-800 block">📢 Реклама</span>
              <div className="text-base font-black text-slate-900 mt-1 font-mono">{paidAds} zł</div>
            </div>
            <button
              type="button"
              onClick={() => openManualEntryModal('Реклама и маркетинг')}
              className="mt-2 w-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-bold py-1 px-1 rounded-lg transition"
            >
              + Внести
            </button>
          </div>

          {/* Резерв */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-800 block">🛡️ Резерв</span>
              <div className="text-base font-black text-slate-900 mt-1 font-mono">{paidReserve} zł</div>
            </div>
            <button
              type="button"
              onClick={() => openManualEntryModal('Резервный фонд')}
              className="mt-2 w-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-bold py-1 px-1 rounded-lg transition"
            >
              + Отложить
            </button>
          </div>

          {/* Налоги */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-800 block">🏛️ Налоги</span>
              <div className="text-base font-black text-slate-900 mt-1 font-mono">{paidTaxes} zł</div>
            </div>
            <button
              type="button"
              onClick={() => openManualEntryModal('Налоги')}
              className="mt-2 w-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-bold py-1 px-1 rounded-lg transition"
            >
              + Внести
            </button>
          </div>

          {/* Абонементы */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-800 block">🔄 Абонементы</span>
              <div className="text-base font-black text-slate-900 mt-1 font-mono">{paidSubs} zł</div>
            </div>
            <button
              type="button"
              onClick={() => openManualEntryModal('Абонементы')}
              className="mt-2 w-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-bold py-1 px-1 rounded-lg transition"
            >
              + Внести
            </button>
          </div>
        </div>
      </div>

      {/* Ведомость клинеров */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            👩‍🌾 Расчёты с клинерами и наличные на руках
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
                    Начислено ЗП: <span className="text-amber-600">{c.totalAccrued} zł</span>
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
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[10px] transition shadow-2xs cursor-pointer"
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

      {/* Журнал операций */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            🧾 Журнал операций, расходов и возвратов налички
          </h2>
          <span className="text-[11px] text-slate-500 font-semibold">
            Записей: {expensesList.length}
          </span>
        </div>

        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[380px]">
          {expensesList.length > 0 ? (
            expensesList.map((e: any) => (
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
                    className="text-slate-300 hover:text-rose-600 font-bold text-sm px-1 transition cursor-pointer"
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
              <h3 className="text-base font-bold text-slate-900">➕ Финансовая операция</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
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
                  🔴 Выплата / Расход
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
                    className="text-blue-600 font-bold text-[10px] hover:underline cursor-pointer"
                  >
                    {isCustomCategory ? '← Выбрать из списка' : '+ Своя категория'}
                  </button>
                </div>

                {isCustomCategory ? (
                  <input
                    type="text"
                    required
                    placeholder="Например: Покупка инвентаря..."
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
                  Сотрудник (если выплата клинеру)
                </label>
                <select
                  value={form.cleanerId}
                  onChange={(e) => setForm({ ...form, cleanerId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="">Без привязки к конкретному клинеру</option>
                  {cleanersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                  Комментарий
                </label>
                <textarea
                  rows={2}
                  placeholder="Детали операции..."
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition shadow-xs cursor-pointer"
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
