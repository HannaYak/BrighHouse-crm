"use client";
import React, { useState, useEffect } from 'react';

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Фильтруем только активные и завершенные заказы (без отмененных)
  const validOrders = orders.filter(o => o.status !== 'CANCELLED');

  // Базовая экономика
  const totalRevenue = validOrders.reduce((sum, o) => sum + (o.price || 0), 0);
  const salaryFund = totalRevenue * 0.50; // 50% на ЗП
  const materialsCost = totalRevenue * 0.10; // 10% на химию
  const netProfit = totalRevenue - salaryFund - materialsCost;

  // Статистика по клинерам
  const cleanerStats = cleaners.map(cleaner => {
    const cleanerOrders = validOrders.filter(o => 
      o.assignedCleaners?.some((ac: any) => ac.cleanerId === cleaner.id || ac.cleaner?.id === cleaner.id)
    );
    
    let earnedForCompany = 0;
    let personalSalary = 0;

    cleanerOrders.forEach(o => {
      const brigadeSize = o.assignedCleaners?.length || 1;
      earnedForCompany += (o.price || 0) / brigadeSize;
      personalSalary += ((o.price || 0) * 0.50) / brigadeSize;
    });

    return {
      ...cleaner,
      ordersCount: cleanerOrders.length,
      earnedForCompany,
      personalSalary
    };
  }).sort((a, b) => b.earnedForCompany - a.earnedForCompany); // Сортируем по выручке

  if (loading) return <div className="p-10 text-center text-slate-500">Загрузка аналитики...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">📈 Финансовая аналитика</h1>
        <p className="text-xs text-slate-500">Unit-экономика, выручка и статистика по сотрудникам</p>
      </div>

      {/* KPI Карточки */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 mb-1">Общая выручка</div>
          <div className="text-2xl font-extrabold text-slate-900">{totalRevenue.toFixed(0)} zł</div>
          <div className="text-[10px] font-semibold text-emerald-600 mt-2">Всего заказов: {validOrders.length}</div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 mb-1">Зарплатный фонд (50%)</div>
          <div className="text-2xl font-extrabold text-indigo-600">{salaryFund.toFixed(0)} zł</div>
          <div className="text-[10px] font-semibold text-slate-400 mt-2">Выплаты исполнителям</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 mb-1">Расходники (10%)</div>
          <div className="text-2xl font-extrabold text-amber-600">{materialsCost.toFixed(0)} zł</div>
          <div className="text-[10px] font-semibold text-slate-400 mt-2">Химия, проезд, амортизация</div>
        </div>

        <div className="bg-brand-600 p-5 rounded-2xl border border-brand-700 shadow-sm text-white">
          <div className="text-xs font-bold text-brand-100 mb-1">Чистая прибыль (40%)</div>
          <div className="text-2xl font-extrabold">{netProfit.toFixed(0)} zł</div>
          <div className="text-[10px] font-semibold text-brand-200 mt-2">Net Profit</div>
        </div>
      </div>

      {/* Рейтинг сотрудников */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-800">🏆 Эффективность сотрудников (Leaderboard)</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-3.5 pl-5">Сотрудник</th>
              <th className="p-3.5 text-center">Заказов выполнено</th>
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
                <td className="p-3.5 text-right font-bold text-emerald-600">{cleaner.earnedForCompany.toFixed(0)} zł</td>
                <td className="p-3.5 text-right pr-5 font-bold text-indigo-600">{cleaner.personalSalary.toFixed(0)} zł</td>
              </tr>
            ))}
            {cleanerStats.filter(c => c.ordersCount === 0).length > 0 && (
              <tr>
                <td colSpan={4} className="p-3.5 text-center text-slate-400 text-[10px] bg-slate-50/50">
                  Остальные {cleanerStats.filter(c => c.ordersCount === 0).length} сотрудников пока без заказов
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
