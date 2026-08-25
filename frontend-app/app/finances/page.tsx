"use client";
import React, { useState, useEffect } from 'react';

export default function FinancesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadFinances = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finances');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinances();
  }, []);

  // Экспорт ведомости выплат и сводки в CSV (Excel-совместимый)
  const exportToCSV = () => {
    if (!data || !data.cleanerStats) return;

    const rows = [
      ['Отчет по финансам и выплатам BrightHouse CRM'],
      [`Дата выгрузки: ${new Date().toLocaleDateString('ru-RU')}`],
      [''],
      ['Сводка показателей:'],
      ['Выручка (выполненные заказы)', `${data.completedRevenue || 0} zł`],
      ['Фонд оплаты труда (клинерам)', `${data.totalPayouts || 0} zł`],
      ['Чистая прибыль компании', `${data.netProfit || 0} zł`],
      ['Всего заказов', `${data.ordersCount || 0}`],
      ['Выполненных уборок', `${data.completedCount || 0}`],
      [''],
      ['Ведомость по клинерам:'],
      ['Имя клинера', 'Телефон', 'Telegram', 'Выполнено уборок', 'Сумма к выплате (zł)'],
      ...data.cleanerStats.map((c: any) => [
        `"${c.name}"`,
        `"${c.phone || ''}"`,
        `"${c.telegramHandle || ''}"`,
        c.completedCount,
        c.totalPayout,
      ]),
    ];

    const csvContent = '\uFEFF' + rows.map(e => e.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `brighthouse_finances_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-10 text-center text-slate-500 text-xs">Загрузка финансового отчета...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Заголовок и кнопка экспорта */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📊 Финансы и выплаты клинерам</h1>
          <p className="text-xs text-slate-500">Сводка по выручке, расходам на оплату труда и чистой прибыли</p>
        </div>
        <button
          onClick={exportToCSV}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm flex items-center gap-2"
        >
          📥 Экспорт в Excel / CSV
        </button>
      </div>

      {/* Ключевые финансовые метрики */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Выручка (Завершенные)</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{data?.completedRevenue?.toLocaleString() || 0} zł</p>
          <p className="text-[11px] text-emerald-600 mt-1 font-semibold">{data?.completedCount} выполненных уборок</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Выплаты клинерам</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{data?.totalPayouts?.toLocaleString() || 0} zł</p>
          <p className="text-[11px] text-slate-500 mt-1">Фонд оплаты труда</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Чистая прибыль</p>
          <p className="text-2xl font-extrabold text-brand-600 mt-1">{data?.netProfit?.toLocaleString() || 0} zł</p>
          <p className="text-[11px] text-emerald-600 mt-1 font-semibold">Остаток компании</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Маржинальность</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {data?.completedRevenue ? Math.round((data.netProfit / data.completedRevenue) * 100) : 0}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Рентабельность заказов</p>
        </div>
      </div>

      {/* Ведомость начислений каждому клинеру */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-900">👥 Расчет зарплат клинеров к выплате</h2>
          <span className="text-[11px] text-slate-500">Авторасчет по закрытым нарядам</span>
        </div>

        <div className="divide-y divide-slate-100">
          {data?.cleanerStats?.map((cleaner: any) => (
            <div key={cleaner.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">{cleaner.name}</span>
                  {cleaner.telegramHandle && (
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-semibold">
                      {cleaner.telegramHandle}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Тел: {cleaner.phone || 'Не указан'} • Выполнено уборок: <b>{cleaner.completedCount}</b>
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">К выплате</span>
                  <span className="text-sm font-extrabold text-emerald-600">{cleaner.totalPayout} zł</span>
                </div>
              </div>
            </div>
          ))}

          {(!data?.cleanerStats || data.cleanerStats.length === 0) && (
            <div className="p-8 text-center text-xs text-slate-400">Клинеры еще не добавлены в систему.</div>
          )}
        </div>
      </div>
    </div>
  );
}
