"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
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
    loadDashboard();
  }, []);

  if (loading) return <div className="p-10 text-center text-slate-500 text-xs">Загрузка панели управления...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Приветствие и быстрые действия */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">✨ Панель управления BrightHouse</h1>
          <p className="text-xs text-slate-500">Сводка показателей бизнеса и операционные задачи на сегодня</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/calculator"
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
          >
            🧮 Расчет / Заказ
          </Link>
          <Link
            href="/kanban"
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
          >
            📋 Канбан-доска
          </Link>
        </div>
      </div>

      {/* Верхние 4 карточки KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Выручка (Месяц)</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {data?.totalRevenueMonth?.toLocaleString() || 0} zł
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            ✓ {data?.completedMonthCount} выполненных уборок
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Средний чек</span>
          <div className="text-2xl font-extrabold text-brand-600 mt-1">
            {data?.avgCheck || 0} zł
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            По закрытым нарядам
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Уборок на сегодня</span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {data?.todayCount || 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            В расписании на сегодня
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Всего заказов в месяце</span>
          <div className="text-2xl font-extrabold text-purple-600 mt-1">
            {data?.monthCount || 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Новые, в работе и закрытые
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Заказы на сегодня (Левая колонка) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              📅 Расписание на сегодня ({data?.todayOrders?.length || 0})
            </h2>
            <Link href="/schedule" className="text-xs text-brand-600 font-bold hover:underline">
              Все расписание →
            </Link>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[380px]">
            {data?.todayOrders?.map((order: any) => {
              const team = order.assignedCleaners?.map((ac: any) => ac.cleaner?.name).join(', ') || 'Бригада не назначена';
              return (
                <div key={order.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-brand-600">{order.orderNumber}</span>
                      <span className="font-bold text-slate-900">{order.clientName || 'Без имени'}</span>
                      <span className="text-[10px] text-slate-500 bg-white border px-1.5 py-0.5 rounded font-bold">
                        {order.timeSlot?.split('—')[0]?.trim() || order.startTime || '10:00'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 truncate max-w-sm">
                      📍 {order.addressLine1}
                    </div>
                    <div className="text-[10px] text-slate-600 font-semibold mt-1">
                      👥 Клинеры: {team}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-emerald-600 block">{order.price} zł</span>
                    <span className="text-[10px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                      {order.status}
                    </span>
                  </div>
                </div>
              );
            })}

            {(!data?.todayOrders || data.todayOrders.length === 0) && (
              <div className="text-center py-12 text-xs text-slate-400">
                На сегодня уборок не запланировано.
              </div>
            )}
          </div>
        </div>

        {/* Рейтинг клинеров (Правая колонка) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              🏆 Рейтинг клинеров
            </h2>
            <Link href="/cleaners" className="text-xs text-brand-600 font-bold hover:underline">
              Управление →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[380px]">
            {data?.cleanerPerformance?.map((cleaner: any, idx: number) => (
              <div key={cleaner.id} className="p-3.5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                    idx === 0 ? 'bg-amber-100 text-amber-800' :
                    idx === 1 ? 'bg-slate-200 text-slate-700' :
                    idx === 2 ? 'bg-amber-50 text-amber-700' :
                    'bg-slate-50 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-xs text-slate-900">{cleaner.name}</div>
                    <div className="text-[10px] text-slate-400">📍 {cleaner.district || 'Район не указан'}</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-extrabold text-slate-800 block">
                    {cleaner.completedCount} уборок
                  </span>
                  {cleaner.isLinked ? (
                    <span className="text-[9px] text-emerald-600 font-bold">● Бот активен</span>
                  ) : (
                    <span className="text-[9px] text-amber-600 font-bold">○ Ожидает PIN</span>
                  )}
                </div>
              </div>
            ))}

            {(!data?.cleanerPerformance || data.cleanerPerformance.length === 0) && (
              <div className="text-center py-12 text-xs text-slate-400">Клинеры еще не добавлены.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
