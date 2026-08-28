"use client";
import React, { useState, useEffect } from 'react';

export default function FinancesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/orders');
      if (res.ok) {
        setOrders(await res.json());
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

  const handleDownloadCsv = () => {
    window.open(`/api/export?month=${exportMonth}`, '_blank');
  };

  const completedOrders = orders.filter((o: any) => o.status === 'COMPLETED');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.price || 0), 0);
  const cleanerPayouts = Math.round(totalRevenue * 0.4);
  const netProfit = totalRevenue - cleanerPayouts;

  if (loading) return <div className="p-10 text-center text-slate-500 text-xs">Загрузка финансов...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Шапка с кнопкой экспорта */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📊 Финансы и P&L</h1>
          <p className="text-xs text-slate-500">Выручка, выплаты клинерам и чистая прибыль компании</p>
        </div>

        {/* Блок выгрузки CSV/Excel */}
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={exportMonth}
            onChange={(e) => setExportMonth(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 shadow-xs outline-none"
          />
          <button
            onClick={handleDownloadCsv}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5"
          >
            📥 Скачать отчет (Excel/CSV)
          </button>
        </div>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Общая выручка</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalRevenue.toLocaleString()} zł</div>
          <span className="text-[11px] text-slate-500 mt-1 block">{completedOrders.length} закрытых заказов</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Выплаты клинерам (~40%)</span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{cleanerPayouts.toLocaleString()} zł</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Фонд оплаты труда</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Чистая прибыль</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{netProfit.toLocaleString()} zł</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Маржа ~60%</span>
        </div>
      </div>

      {/* Таблица последних заказов */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">История закрытых уборок</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {completedOrders.map((o: any) => (
            <div key={o.id} className="p-4 flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-slate-900">{o.clientName || 'Без имени'}</span>
                <span className="text-slate-400 ml-2 font-mono">{o.orderNumber}</span>
                <p className="text-[11px] text-slate-500 mt-0.5">📍 {o.addressLine1}</p>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-slate-900 block">{o.price} zł</span>
                <span className="text-[10px] text-slate-400">Клинеру: {Math.round((o.price || 0) * 0.4)} zł</span>
              </div>
            </div>
          ))}
          {completedOrders.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">Пока нет завершенных уборок.</div>
          )}
        </div>
      </div>
    </div>
  );
}
