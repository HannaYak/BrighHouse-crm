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

  // Стейты для фильтра
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchData = async () => {
      try {
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

  // 1. Фильтруем заказы (не отмененные + попадают в выбранный месяц и год)
  const filteredOrders = orders.filter(o => {
    if (o.status === 'CANCELLED') return false;
    const d = new Date(o.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  // 2. Расчет базовой экономики по реальным часам
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.price || 0), 0);
  
  let salaryFund = 0;
  filteredOrders.forEach(o => {
    let durationHours = 0;
    if (o.timeSlot) {
      const parts = o.timeSlot.split(/[-—]/);
      if (parts.length === 2) {
        const [startH, startM] = parts[0].trim().split(':').map(Number);
        const [endH, endM] = parts[1].trim().split(':').map(Number);
        let diff = (endH + endM / 60) - (startH + startM / 60);
        if (diff < 0) diff += 24; // Если переходит через полночь
        durationHours = diff;
      }
    }
    // Определяем ставку
    const rate = (o.serviceType === 'GENERAL' || o.serviceType === 'AFTER_REPAIR') ? 35 : 30;
    const brigadeSize = o.assignedCleaners?.length || 1;
    
    // Сумма ЗП за этот заказ на всю бригаду
    salaryFund += (durationHours * rate) * brigadeSize;
  });

  const materialsCost = totalRevenue * 0.10; // 10% на химию от выручки
  const netProfit = totalRevenue - salaryFund - materialsCost;

  // 3. Статистика по клинерам за период
  const cleanerStats = cleaners.map(cleaner => {
    const cleanerOrders = filteredOrders.filter(o => 
      o.assignedCleaners?.some((ac: any) => ac.cleanerId === cleaner.id || ac.cleaner?.id === cleaner.id)
    );
    
    let earnedForCompany = 0;
    let personalSalary = 0;
    let hoursWorked = 0;

    cleanerOrders.forEach(o => {
      const brigadeSize = o.assignedCleaners?.length || 1;
      // Вклад в компанию (выручка делится на количество человек в бригаде)
      earnedForCompany += (o.price || 0) / brigadeSize;

      // Расчет часов для конкретного клинера
      let durationHours = 0;
      if (o.timeSlot) {
        const parts = o.timeSlot.split(/[-—]/);
        if (parts.length === 2) {
          const [startH, startM] = parts[0].trim().split(':').map(Number);
          const [endH, endM] = parts[1].trim().split(':').map(Number);
          let diff = (endH + endM / 60) - (startH + startM / 60);
          if (diff < 0) diff += 24;
          durationHours = diff;
        }
      }
      
      hoursWorked += durationHours;
      const rate = (o.serviceType === 'GENERAL' || o.serviceType === 'AFTER_REPAIR') ? 35 : 30;
      personalSalary += durationHours * rate;
    });

    return {
      ...cleaner,
      ordersCount: cleanerOrders.length,
      earnedForCompany,
      personalSalary,
      hoursWorked
    };
  }).sort((a, b) => b.earnedForCompany - a.earnedForCompany);

  // 4. Функция выгрузки в CSV (Excel)
  const exportToCSV = () => {
    const headers = ['Имя сотрудника', 'Выполнено заказов', 'Отработано часов', 'Принес выручки (zl)', 'Зарплата к выплате (zl)'];
    const rows = cleanerStats
      .filter(c => c.ordersCount > 0)
      .map(c => [
        c.name, 
        c.ordersCount, 
        c.hoursWorked.toFixed(1),
        c.earnedForCompany.toFixed(2), 
        c.personalSalary.toFixed(2)
      ]);

    const csvContent = [
      headers.join(';'), // Разделитель для Excel
      ...rows.map(r => r.join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Зарплаты_BrightHouse_${MONTHS[selectedMonth]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 5}, (_, i) => currentYear - 2 + i);

  if (loading) return <div className="p-10 text-center text-slate-500">Загрузка аналитики...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📈 Финансовая аналитика</h1>
          <p className="text-xs text-slate-500">Unit-экономика, выручка и статистика по сотрудникам</p>
        </div>

        {/* Панель фильтров и экспорта */}
        <div className="flex items-center gap-3 bg-white p-2 border border-slate-200 rounded-xl shadow-sm">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-lg px-3 py-1.5 focus:outline-none"
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>

          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-lg px-3 py-1.5 focus:outline-none"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <button 
            onClick={exportToCSV}
            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-sm font-bold px-4 py-1.5 rounded-lg transition"
          >
            📥 Скачать Excel
          </button>
        </div>
      </div>

      {/* KPI Карточки */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 mb-1">Выручка за период</div>
          <div className="text-2xl font-extrabold text-slate-900">{totalRevenue.toFixed(0)} zł</div>
          <div className="text-[10px] font-semibold text-emerald-600 mt-2">Заказов в периоде: {filteredOrders.length}</div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 mb-1">Зарплатный фонд (Почасовая)</div>
          <div className="text-2xl font-extrabold text-indigo-600">{salaryFund.toFixed(0)} zł</div>
          <div className="text-[10px] font-semibold text-slate-400 mt-2">Выплаты исполнителям (30-35 zł/ч)</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 mb-1">Расходники (10%)</div>
          <div className="text-2xl font-extrabold text-amber-600">{materialsCost.toFixed(0)} zł</div>
          <div className="text-[10px] font-semibold text-slate-400 mt-2">Химия, проезд, амортизация</div>
        </div>

        <div className="bg-brand-600 p-5 rounded-2xl border border-brand-700 shadow-sm text-white">
          <div className="text-xs font-bold text-brand-100 mb-1">Чистая прибыль</div>
          <div className="text-2xl font-extrabold">{netProfit.toFixed(0)} zł</div>
          <div className="text-[10px] font-semibold text-brand-200 mt-2">Net Profit за {MONTHS[selectedMonth]}</div>
        </div>
      </div>

      {/* Рейтинг сотрудников */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-800">🏆 Зарплаты и эффективность (Leaderboard)</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-3.5 pl-5">Сотрудник</th>
              <th className="p-3.5 text-center">Заказов</th>
              <th className="p-3.5 text-center">Часов</th>
              <th className="p-3.5 text-right">Принес компании (zł)</th>
              <th className="p-3.5 text-right pr-5">ЗП к выплате (zł)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cleanerStats.filter(c => c.ordersCount > 0).map((cleaner, idx) => (
              <tr key={cleaner.id} className="hover:bg-slate-50 transition">
                <td className="p-3.5 pl-5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    {idx === 0 && '🥇'} {idx === 1 && '🥈'} {idx === 2 && '🥉'} {idx > 2 && '▪️'}
                    {cleaner.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 ml-6">{cleaner.district}</div>
                </td>
                <td className="p-3.5 text-center font-extrabold text-slate-700">{cleaner.ordersCount}</td>
                <td className="p-3.5 text-center font-bold text-blue-600">{cleaner.hoursWorked.toFixed(1)} ч</td>
                <td className="p-3.5 text-right font-bold text-emerald-600">{cleaner.earnedForCompany.toFixed(0)} zł</td>
                <td className="p-3.5 text-right pr-5 font-bold text-indigo-600">{cleaner.personalSalary.toFixed(0)} zł</td>
              </tr>
            ))}
            {cleanerStats.filter(c => c.ordersCount === 0).length > 0 && (
              <tr>
                <td colSpan={5} className="p-3.5 text-center text-slate-400 text-[10px] bg-slate-50/50">
                  Остальные {cleanerStats.filter(c => c.ordersCount === 0).length} сотрудников без заказов в этом месяце
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
