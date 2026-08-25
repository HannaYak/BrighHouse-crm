import { prisma } from '../lib/prisma';
import Link from 'next/link';

export default async function DashboardPage() {
  // Получаем базовую статистику для дашборда
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Заказы на сегодня
  const todayOrders = await prisma.order.findMany({
    where: {
      date: {
        gte: todayStart,
        lte: todayEnd,
      },
      status: { not: 'CANCELLED' },
    },
    include: {
      assignedCleaners: {
        include: { cleaner: true },
      },
    },
  });

  // Всего активных заказов
  const totalOrdersCount = await prisma.order.count({
    where: { status: { not: 'CANCELLED' } },
  });

  // Активные клиенты
  const clientsCount = await prisma.client.count();

  // Общая сумма заказов за всё время (выручка)
  const allOrders = await prisma.order.findMany({
    where: { status: { not: 'CANCELLED' } },
    select: { price: true },
  });

  const totalRevenue = allOrders.reduce((acc, order) => acc + (order.price || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Приветствие */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">🌸 Добро пожаловать в BrightHouse CRM</h1>
          <p className="text-xs text-slate-500 mt-0.5">Система управления клининговым бизнесом в Варшаве</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/kanban"
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm"
          >
            📋 Открыть Канбан
          </Link>
          <Link
            href="/chat"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition"
          >
            💬 Чаты с клиентами
          </Link>
        </div>
      </div>

      {/* Ключевые показатели (Метрики) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Заказов на сегодня</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{todayOrders.length}</p>
          <p className="text-[11px] text-emerald-600 mt-1 font-semibold">Активных смен</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Всего заказов</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalOrdersCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">За всё время</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">База клиентов</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{clientsCount}</p>
          <p className="text-[11px] text-blue-600 mt-1 font-semibold">Заказчиков</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Общая выручка</p>
          <p className="text-2xl font-extrabold text-brand-600 mt-1">{totalRevenue.toLocaleString()} zł</p>
          <p className="text-[11px] text-slate-500 mt-1">Сумма всех уборок</p>
        </div>
      </div>

      {/* Список уборок на сегодня */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-900">🗓 Заказы на сегодня ({new Date().toLocaleDateString()})</h2>
          <Link href="/schedule" className="text-xs font-bold text-brand-600 hover:underline">
            Смотреть всю шахматку смен →
          </Link>
        </div>

        {todayOrders.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl">
            На сегодня запланированных уборок нет. Отдыхаем! ☕
          </div>
        ) : (
          <div className="space-y-3">
            {todayOrders.map((order) => {
              const team = order.assignedCleaners.map((ac) => ac.cleaner.name).join(' + ') || 'Бригада не назначена';
              return (
                <div key={order.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-brand-600">{order.orderNumber}</span>
                      <span className="text-xs font-bold text-slate-900">{order.serviceType}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">{order.timeSlot}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">📍 <b>Адрес:</b> {order.addressLine1}</p>
                    <p className="text-xs text-slate-600">👤 <b>Клиент:</b> {order.clientName} ({order.clientPhone})</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 block">
                      👥 Бригада: {team}
                    </span>
                    <span className="text-xs font-bold text-slate-900 mt-1 block">
                      💰 {order.price} zł
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
