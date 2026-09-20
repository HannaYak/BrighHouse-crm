"use client";
import React, { useState, useEffect } from 'react';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resOrders, resCleaners] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/cleaners')
        ]);
        if (resOrders.ok) setOrders(await resOrders.json());
        if (resCleaners.ok) setCleaners(await resCleaners.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Фильтруем неотмененные заказы за выбранный месяц
  const filteredOrders = orders.filter(o => {
    if (o.status === 'CANCELLED') return false;
    const d = new Date(o.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  // Общая выручка
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);

  // Расчет по каждому клинеру с учетом бригады, спецвыплат и наличных на руках
  const cleanerStats = cleaners.map(cleaner => {
    const cleanerOrders = filteredOrders.filter(o => 
      o.assignedCleaners?.some((ac: any) => {
        const cId = ac.cleanerId || ac.cleaner?.id || ac.id;
        return Number(cId) === Number(cleaner.id);
      })
    );

    let earnedForCompany = 0;
    let standardHours = 0;
    let heavyHours = 0;
    let specialistPayout = 0;
    let cashInHand = 0;

    cleanerOrders.forEach(o => {
      const brigadeSize = Math.max(1, o.assignedCleaners?.length || 1);
      const orderPrice = Number(o.price) || 0;
      earnedForCompany += orderPrice / brigadeSize;

      // Если клинер лично забрал наличные у клиента
      if (o.paymentMethod === 'CASH' && Number(o.cashCollectedById) === Number(cleaner.id)) {
        cashInHand += orderPrice;
      }

      // Парсинг времени заказа
      let duration = 3.5;
      if (o.timeSlot) {
        const parts = o.timeSlot.split(/[-—]/).map((s: string) => s.trim());
        const [sh, sm] = (parts[0] || '10:00').split(':').map(Number);
        const [eh, em] = (parts[1] || '13:30').split(':').map(Number);
        const diff = (eh + (em || 0) / 60) - (sh + (sm || 0) / 60);
        if (diff > 0) duration = diff;
      }

      // Спецвыплаты за окна и витрины (делятся между участниками бригады или мастеру)
      const windowsCount = Number(o.windowsCount) || 0;
      const balconyWindowsCount = Number(o.balconyWindowsCount) || 0;
      const showcaseWindowsCount = Number(o.showcaseWindowsCount) || 0;
      const windowsRevenue = (windowsCount * 35) + (balconyWindowsCount * 45) + (showcaseWindowsCount * 50);

      // Химчистка мебели
      const dryCleanRevenue =
        (Number(o.drySofa2) || 0) * 180 +
        (Number(o.drySofa3) || 0) * 200 +
        (Number(o.drySofaCorner4) || 0) * 220 +
        (Number(o.drySofaBig) || 0) * 260 +
        (Number(o.drySofaU) || 0) * 260 +
        (Number(o.dryArmchair) || 0) * 60 +
        (Number(o.dryChair) || 0) * 15 +
        (Number(o.dryCarpetM2) || 0) * 15;

      if (windowsRevenue > 0 || dryCleanRevenue > 0) {
        // Выплата мастеру: 40% от химчистки и окон
        specialistPayout += ((windowsRevenue + dryCleanRevenue) * 0.40) / brigadeSize;
      }

      const isHeavy = o.serviceType === 'GENERAL' || o.serviceType === 'AFTER_REPAIR' || o.serviceType === 'OFFICE_GENERAL';
      if (isHeavy) {
        heavyHours += duration;
      } else {
        standardHours += duration;
      }
    });

    // 30 zł/ч за стандарт, 35 zł/ч за генералку/после ремонта + спецвыплаты
    const salaryStandard = standardHours * 30;
    const salaryHeavy = heavyHours * 35;
    const totalEarnedSalary = salaryStandard + salaryHeavy + specialistPayout;
    const netPayout = totalEarnedSalary - cashInHand;

    return {
      ...cleaner,
      ordersCount: cleanerOrders.length,
      standardHours,
      heavyHours,
      totalHours: standardHours + heavyHours,
      specialistPayout,
      cashInHand,
      earnedForCompany,
      totalSalary: totalEarnedSalary,
      netPayout,
    };
  }).sort((a, b) => b.earnedForCompany - a.earnedForCompany);

  const totalSalaryFund = cleanerStats.reduce((sum, c) => sum + c.totalSalary, 0);
  const totalCashCollected = cleanerStats.reduce((sum, c) => sum + c.cashInHand, 0);
  const materialsCost = totalRevenue * 0.10; // 10% на химию и инвентарь
  const netProfit = totalRevenue - totalSalaryFund - materialsCost;

  // Экспорт в CSV / Excel с корректной кодировкой UTF-8 BOM
  const exportToCSV = () => {
    const headers = [
      'Сотрудник',
      'Район',
      'Заказов выполнено',
      'Стандарт (часы)',
      'Генералка/Ремонт (часы)',
      'Всего часов',
      'Окна и химчистка (zł)',
      'Начислено ЗП (zł)',
      'Забрал наличных (zł)',
      'К выплате на карту (zł)',
      'Принес выручки компании (zł)'
    ];

    const rows = cleanerStats
      .filter(c => c.ordersCount > 0)
      .map(c => [
        `"${c.name}"`,
        `"${c.district || 'Центр'}"`,
        c.ordersCount,
        c.standardHours.toFixed(1),
        c.heavyHours.toFixed(1),
        c.totalHours.toFixed(1),
        c.specialistPayout.toFixed(2),
        c.totalSalary.toFixed(2),
        c.cashInHand.toFixed(2),
        c.netPayout.toFixed(2),
        c.earnedForCompany.toFixed(2)
      ]);

    const summaryRow = [
      '"ИТОГО ПО ФИРМЕ"',
      '""',
      filteredOrders.length,
      '""',
      '""',
      '""',
      '""',
      totalSalaryFund.toFixed(2),
      totalCashCollected.toFixed(2),
      (totalSalaryFund - totalCashCollected).toFixed(2),
      totalRevenue.toFixed(2)
    ];

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.join(';')),
      summaryRow.join(';')
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BrightHouse_Отчет_${MONTHS[selectedMonth]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (loading) {
    return <div className="p-10 text-center text-xs text-slate-500">Загрузка аналитики и отчетов...</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4">
      {/* Верхняя плашка */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📈 Финансовая аналитика и Расчет зарплат</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Учет бригад, смен, спецвыплат за окна/химчистку и перерасчета наличных
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 outline-none"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={exportToCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>📥</span>
            <span>Скачать отчет (CSV)</span>
          </button>
        </div>
      </div>

      {/* Карточки метрик */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Выручка за месяц</div>
          <div className="text-2xl font-extrabold text-slate-900">{totalRevenue.toFixed(0)} zł</div>
          <div className="text-[11px] font-semibold text-emerald-600 mt-2">
            Заказов в периоде: {filteredOrders.length}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Зарплатный фонд</div>
          <div className="text-2xl font-extrabold text-indigo-600">{totalSalaryFund.toFixed(0)} zł</div>
          <div className="text-[11px] font-semibold text-slate-400 mt-2">
            Наличные у клинеров: {totalCashCollected.toFixed(0)} zł
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Расходники (10%)</div>
          <div className="text-2xl font-extrabold text-amber-600">{materialsCost.toFixed(0)} zł</div>
          <div className="text-[11px] font-semibold text-slate-400 mt-2">
            Химия, инвентарь, логистика
          </div>
        </div>

        <div className="bg-blue-600 p-5 rounded-2xl border border-blue-700 shadow-xs text-white">
          <div className="text-xs font-bold text-blue-100 uppercase tracking-wider mb-1">Чистая прибыль</div>
          <div className="text-2xl font-extrabold">{netProfit.toFixed(0)} zł</div>
          <div className="text-[11px] font-semibold text-blue-200 mt-2">
            Чистый доход фирмы
          </div>
        </div>
      </div>

      {/* Детальная таблица выплат клинерам */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800">
            👥 Расчет выплат клинерам за {MONTHS[selectedMonth]} {selectedYear}
          </h2>
          <span className="text-[11px] text-slate-500">
            Сотрудников с заказами: {cleanerStats.filter(c => c.ordersCount > 0).length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5 pl-5">Клинер</th>
                <th className="p-3.5 text-center">Заказов</th>
                <th className="p-3.5 text-center">Стандарт (30 zł)</th>
                <th className="p-3.5 text-center">Генералка (35 zł)</th>
                <th className="p-3.5 text-center">Спецвыплаты</th>
                <th className="p-3.5 text-right">Начислено ЗП</th>
                <th className="p-3.5 text-right text-amber-800">На руках наличными</th>
                <th className="p-3.5 text-right pr-5 font-black text-slate-900">К переводу (zł)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cleanerStats.filter(c => c.ordersCount > 0).map((c, idx) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 pl-5">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '👤'}</span>
                      <span>{c.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 ml-6">📍 {c.district || 'Центр'}</div>
                  </td>
                  <td className="p-3.5 text-center font-bold text-slate-700">{c.ordersCount}</td>
                  <td className="p-3.5 text-center font-mono text-slate-600">{c.standardHours.toFixed(1)} ч</td>
                  <td className="p-3.5 text-center font-mono text-indigo-600 font-semibold">{c.heavyHours.toFixed(1)} ч</td>
                  <td className="p-3.5 text-center font-mono text-amber-700 font-medium">
                    {c.specialistPayout > 0 ? `+${c.specialistPayout.toFixed(0)} zł` : '—'}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-slate-700">{c.totalSalary.toFixed(0)} zł</td>
                  <td className="p-3.5 text-right font-mono font-bold text-amber-700">
                    {c.cashInHand > 0 ? `-${c.cashInHand.toFixed(0)} zł` : '0 zł'}
                  </td>
                  <td className={`p-3.5 text-right pr-5 font-mono font-extrabold text-sm ${c.netPayout >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {c.netPayout.toFixed(0)} zł
                  </td>
                </tr>
              ))}

              {cleanerStats.filter(c => c.ordersCount === 0).length > 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-slate-400 text-[11px] bg-slate-50/40">
                    Остальные {cleanerStats.filter(c => c.ordersCount === 0).length} сотрудников пока без заказов в выбранном месяце
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
