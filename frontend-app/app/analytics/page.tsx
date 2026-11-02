"use client";
import React, { useState, useEffect, useMemo } from 'react';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

type PeriodMode = 'ALL' | 'THIS_YEAR' | 'PREV_YEAR' | 'LAST_12_M' | 'LAST_6_M' | 'LAST_30_D' | 'MONTH' | 'CUSTOM';

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Режим выбора периода
  const [periodMode, setPeriodMode] = useState<PeriodMode>('ALL');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState('2023-01-01');
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Интерактивный тултип для графика
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; label: string; revenue: number; ordersCount: number } | null>(null);

  // Вкладка: Графики аналитики / Расчет зарплат клинеров
  const [activeTab, setActiveTab] = useState<'CHARTS' | 'SALARIES'>('CHARTS');

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

  // Вычисляем диапазон дат в зависимости от режима
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    if (periodMode === 'ALL') {
      return { startDate: new Date('2023-01-01T00:00:00Z'), endDate: new Date('2029-12-31T23:59:59Z') };
    }
    if (periodMode === 'THIS_YEAR') {
      const y = now.getFullYear();
      return { startDate: new Date(`${y}-01-01T00:00:00Z`), endDate: new Date(`${y}-12-31T23:59:59Z`) };
    }
    if (periodMode === 'PREV_YEAR') {
      const y = now.getFullYear() - 1;
      return { startDate: new Date(`${y}-01-01T00:00:00Z`), endDate: new Date(`${y}-12-31T23:59:59Z`) };
    }
    if (periodMode === 'LAST_12_M') {
      const d = new Date();
      d.setMonth(d.getMonth() - 12);
      return { startDate: d, endDate: now };
    }
    if (periodMode === 'LAST_6_M') {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      return { startDate: d, endDate: now };
    }
    if (periodMode === 'LAST_30_D') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return { startDate: d, endDate: now };
    }
    if (periodMode === 'MONTH') {
      const start = new Date(Date.UTC(selectedYear, selectedMonth, 1));
      const end = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0, 23, 59, 59));
      return { startDate: start, endDate: end };
    }
    if (periodMode === 'CUSTOM') {
      const start = customStartDate ? new Date(`${customStartDate}T00:00:00Z`) : new Date('2023-01-01');
      const end = customEndDate ? new Date(`${customEndDate}T23:59:59Z`) : now;
      return { startDate: start, endDate: end };
    }
    return { startDate: new Date('2023-01-01'), endDate: now };
  }, [periodMode, selectedMonth, selectedYear, customStartDate, customEndDate]);

  // Фильтруем заказы за выбранный период
  const filteredOrders = useMemo(() => {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    return orders.filter(o => {
      if (o.status === 'CANCELLED') return false;
      const orderMs = new Date(o.date).getTime();
      return orderMs >= startMs && orderMs <= endMs;
    });
  }, [orders, startDate, endDate]);

  // KPI Метрики
  const totalRevenue = useMemo(() => filteredOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0), [filteredOrders]);
  const averageCheck = useMemo(() => filteredOrders.length > 0 ? Math.round(totalRevenue / filteredOrders.length) : 0, [totalRevenue, filteredOrders]);
  
  // Уникальные клиенты за период
  const uniqueClientsCount = useMemo(() => {
    const set = new Set();
    filteredOrders.forEach(o => {
      const k = (o.clientPhone || o.clientName || '').trim();
      if (k) set.add(k);
    });
    return set.size;
  }, [filteredOrders]);

  // Каналы привлечения (Instagram, WhatsApp, Telegram, Booksy, Звонок/Сайт)
  const channelStats = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; color: string; icon: string }> = {
      Instagram: { count: 0, revenue: 0, color: '#ec4899', icon: '📸' },
      WhatsApp: { count: 0, revenue: 0, color: '#10b981', icon: '💬' },
      Telegram: { count: 0, revenue: 0, color: '#0ea5e9', icon: '✈️' },
      Booksy: { count: 0, revenue: 0, color: '#8b5cf6', icon: '📖' },
      'Звонок / Сайт': { count: 0, revenue: 0, color: '#f59e0b', icon: '📞' },
    };

    filteredOrders.forEach(o => {
      const notes = o.notes || '';
      let ch = 'Instagram';
      const m = notes.match(/\[Канал:\s*([^\]]+)\]/i);
      if (m && m[1]) {
        const raw = m[1].trim();
        if (raw.includes('WhatsApp') || raw.includes('WhatApp')) ch = 'WhatsApp';
        else if (raw.includes('Telegram') || raw.includes('ТГ')) ch = 'Telegram';
        else if (raw.includes('Booksy')) ch = 'Booksy';
        else if (raw.includes('Звонок') || raw.includes('Сайт')) ch = 'Звонок / Сайт';
        else ch = 'Instagram';
      }
      if (!map[ch]) map[ch] = { count: 0, revenue: 0, color: '#64748b', icon: '🌐' };
      map[ch].count += 1;
      map[ch].revenue += Number(o.price) || 0;
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data,
      percent: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, totalRevenue]);

  // Структура услуг
  const serviceStats = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; color: string }> = {
      'Стандартная / Комплекс': { count: 0, revenue: 0, color: '#3b82f6' },
      'Генеральная уборка': { count: 0, revenue: 0, color: '#6366f1' },
      'После ремонта': { count: 0, revenue: 0, color: '#f97316' },
      'Химчистка': { count: 0, revenue: 0, color: '#14b8a6' },
      'Офисы': { count: 0, revenue: 0, color: '#8b5cf6' },
    };

    filteredOrders.forEach(o => {
      const notes = (o.notes || '').toLowerCase();
      const p = Number(o.price) || 0;
      if (notes.includes('химчистк')) {
        map['Химчистка'].count += 1;
        map['Химчистка'].revenue += p;
      } else if (o.serviceType === 'GENERAL' || notes.includes('генеральн')) {
        map['Генеральная уборка'].count += 1;
        map['Генеральная уборка'].revenue += p;
      } else if (o.serviceType === 'AFTER_REPAIR' || notes.includes('ремонт')) {
        map['После ремонта'].count += 1;
        map['После ремонта'].revenue += p;
      } else if (o.serviceType === 'OFFICE_REGULAR' || o.serviceType === 'OFFICE_GENERAL' || notes.includes('офис')) {
        map['Офисы'].count += 1;
        map['Офисы'].revenue += p;
      } else {
        map['Стандартная / Комплекс'].count += 1;
        map['Стандартная / Комплекс'].revenue += p;
      }
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data,
      percent: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, totalRevenue]);

  // Типы клиентов (Постоянные vs Новички vs Абонементы)
  const clientTypeStats = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; color: string }> = {
      'Постоянные клиенты': { count: 0, revenue: 0, color: '#3b82f6' },
      'Абонементы': { count: 0, revenue: 0, color: '#6366f1' },
      'Новички': { count: 0, revenue: 0, color: '#10b981' },
      'Частые': { count: 0, revenue: 0, color: '#f59e0b' },
      'Редкие / Разовые': { count: 0, revenue: 0, color: '#94a3b8' },
    };

    filteredOrders.forEach(o => {
      const notes = (o.notes || '').toLowerCase();
      const p = Number(o.price) || 0;
      if (notes.includes('постоянный') || notes.includes('постоянник')) {
        map['Постоянные клиенты'].count++;
        map['Постоянные клиенты'].revenue += p;
      } else if (notes.includes('абонимент') || notes.includes('абонемент') || notes.includes('субабон')) {
        map['Абонементы'].count++;
        map['Абонементы'].revenue += p;
      } else if (notes.includes('новичок')) {
        map['Новички'].count++;
        map['Новички'].revenue += p;
      } else if (notes.includes('частый')) {
        map['Частые'].count++;
        map['Частые'].revenue += p;
      } else {
        map['Редкие / Разовые'].count++;
        map['Редкие / Разовые'].revenue += p;
      }
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data,
      percent: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    }));
  }, [filteredOrders, totalRevenue]);

  // Повторные заказы (клиенты с >1 заказом)
  const repeatOrdersPercent = useMemo(() => {
    const ordersPerClient: Record<string, number> = {};
    filteredOrders.forEach(o => {
      const k = (o.clientPhone || o.clientName || '').trim();
      if (k) ordersPerClient[k] = (ordersPerClient[k] || 0) + 1;
    });
    const repeatCount = Object.values(ordersPerClient).filter(c => c > 1).length;
    const totalClients = Object.keys(ordersPerClient).length;
    return totalClients > 0 ? Math.round((repeatCount / totalClients) * 100) : 0;
  }, [filteredOrders]);

  // Данные для временного графика (Timeline Chart)
  // Если период <= 60 дней — группируем по дням; иначе по месяцам
  const timelineData = useMemo(() => {
    const diffDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (86400 * 1000)));
    const groupByDay = diffDays <= 65;

    const buckets: Record<string, { revenue: number; ordersCount: number; label: string }> = {};

    filteredOrders.forEach(o => {
      const d = new Date(o.date);
      const key = groupByDay
        ? d.toISOString().slice(0, 10)
        : d.toISOString().slice(0, 7);

      const label = groupByDay
        ? `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
        : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

      if (!buckets[key]) {
        buckets[key] = { revenue: 0, ordersCount: 0, label };
      }
      buckets[key].revenue += Number(o.price) || 0;
      buckets[key].ordersCount += 1;
    });

    return Object.entries(buckets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, data]) => ({
        key,
        ...data,
      }));
  }, [filteredOrders, startDate, endDate]);

  // ТОП-10 клиентов за период
  const topClients = useMemo(() => {
    const map: Record<string, { name: string; phone: string; count: number; total: number; channel: string; address: string }> = {};

    filteredOrders.forEach(o => {
      const key = o.clientPhone || o.clientName || 'Без контакта';
      if (!map[key]) {
        const m = (o.notes || '').match(/\[Канал:\s*([^\]]+)\]/i);
        map[key] = {
          name: o.clientName || 'Клиент',
          phone: o.clientPhone || '',
          count: 0,
          total: 0,
          channel: m ? m[1].trim() : 'Instagram',
          address: o.addressLine1 || '',
        };
      }
      map[key].count += 1;
      map[key].total += Number(o.price) || 0;
    });

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredOrders]);

  // Расчет по каждому клинеру для зарплатной таблицы
  const cleanerStats = useMemo(() => {
    return cleaners.map(cleaner => {
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

        if (o.paymentMethod === 'CASH' && Number(o.cashCollectedById) === Number(cleaner.id)) {
          cashInHand += orderPrice;
        }

        let duration = 3.5;
        if (o.timeSlot) {
          const parts = o.timeSlot.split(/[-—]/).map((s: string) => s.trim());
          const [sh, sm] = (parts[0] || '10:00').split(':').map(Number);
          const [eh, em] = (parts[1] || '13:30').split(':').map(Number);
          const diff = (eh + (em || 0) / 60) - (sh + (sm || 0) / 60);
          if (diff > 0) duration = diff;
        }

        const windowsCount = Number(o.windowsCount) || 0;
        const balconyWindowsCount = Number(o.balconyWindowsCount) || 0;
        const showcaseWindowsCount = Number(o.showcaseWindowsCount) || 0;
        const windowsRevenue = (windowsCount * 35) + (balconyWindowsCount * 45) + (showcaseWindowsCount * 50);

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
          specialistPayout += ((windowsRevenue + dryCleanRevenue) * 0.40) / brigadeSize;
        }

        const isHeavy = o.serviceType === 'GENERAL' || o.serviceType === 'AFTER_REPAIR' || o.serviceType === 'OFFICE_GENERAL';
        if (isHeavy) {
          heavyHours += duration;
        } else {
          standardHours += duration;
        }
      });

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
  }, [cleaners, filteredOrders]);

  const totalSalaryFund = useMemo(() => cleanerStats.reduce((sum, c) => sum + c.totalSalary, 0), [cleanerStats]);
  const totalCashCollected = useMemo(() => cleanerStats.reduce((sum, c) => sum + c.cashInHand, 0), [cleanerStats]);
  const materialsCost = useMemo(() => totalRevenue * 0.10, [totalRevenue]);
  const estimatedProfit = useMemo(() => totalRevenue - totalSalaryFund - materialsCost, [totalRevenue, totalSalaryFund, materialsCost]);

  // Экспорт в CSV / Excel с поддержкой кодировки UTF-8 BOM
  const exportToCSV = () => {
    const headers = [
      'Дата заказа',
      'Номер заказа',
      'Клиент',
      'Телефон',
      'Адрес',
      'Услуга',
      'Сумма (zł)',
      'Канал привлечения',
      'Тип клиента',
      'Заметки'
    ];

    const rows = filteredOrders.map(o => {
      const notes = o.notes || '';
      const mCh = notes.match(/\[Канал:\s*([^\]]+)\]/i);
      const mTp = notes.match(/\[Тип:\s*([^\]]+)\]/i);
      return [
        `"${new Date(o.date).toISOString().slice(0, 10)}"`,
        `"${o.orderNumber}"`,
        `"${o.clientName || 'Клиент'}"`,
        `"${o.clientPhone || ''}"`,
        `"${o.addressLine1 || ''}"`,
        `"${o.serviceType}"`,
        o.price,
        `"${mCh ? mCh[1] : 'Instagram'}"`,
        `"${mTp ? mTp[1] : 'разовый'}"`,
        `"${notes.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BrightHouse_Аналитика_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold">Загрузка аналитики и базы заказов...</p>
      </div>
    );
  }

  // Расчет точек для интерактивного SVG графика
  const maxRevenue = timelineData.length > 0 ? Math.max(...timelineData.map(d => d.revenue), 100) : 100;
  const chartHeight = 220;
  const chartWidth = 800;
  const paddingX = 40;
  const paddingY = 25;

  const points = timelineData.map((d, i) => {
    const x = paddingX + (i / Math.max(1, timelineData.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (d.revenue / maxRevenue) * (chartHeight - paddingY * 2);
    return { ...d, x, y };
  });

  const svgPath = points.length > 0
    ? points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '')
    : '';

  const svgAreaPath = points.length > 0
    ? `${svgPath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : '';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* Шапка и переключатели периодов */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>📈</span>
              <span>Аналитика и Графики продаж</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Финансовые показатели за любой период, графики выручки, каналы продаж и аналитика LTV клиентов
            </p>
          </div>

          {/* Кнопка экспорта и переключение вкладок */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('CHARTS')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'CHARTS'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📊 Графики и метрики
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SALARIES')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'SALARIES'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👥 Зарплаты клинеров
              </button>
            </div>

            <button
              type="button"
              onClick={exportToCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
            >
              <span>📥</span>
              <span>Экспорт (CSV)</span>
            </button>
          </div>
        </div>

        {/* Быстрые пресеты периода */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">
            Период:
          </span>
          {[
            { id: 'ALL', label: '♾️ Всё время (2023–2026)' },
            { id: 'THIS_YEAR', label: '📅 2026 год' },
            { id: 'PREV_YEAR', label: '🗓️ 2025 год' },
            { id: 'LAST_12_M', label: '12 месяцев' },
            { id: 'LAST_6_M', label: '6 месяцев' },
            { id: 'LAST_30_D', label: '30 дней' },
            { id: 'MONTH', label: '📆 Выбрать месяц' },
            { id: 'CUSTOM', label: '🎯 Свой диапазон дат' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setPeriodMode(btn.id as PeriodMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                periodMode === btn.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Дополнительные фильтры: выбор месяца или выбор календарей от/до */}
        {periodMode === 'MONTH' && (
          <div className="flex items-center gap-3 p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex-wrap animate-fadeIn">
            <span className="text-xs font-bold text-blue-900">Месяц:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white border border-blue-200 text-slate-800 text-xs font-bold rounded-lg px-3 py-1.5 outline-none shadow-2xs"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white border border-blue-200 text-slate-800 text-xs font-bold rounded-lg px-3 py-1.5 outline-none shadow-2xs"
            >
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y} год</option>
              ))}
            </select>
          </div>
        )}

        {periodMode === 'CUSTOM' && (
          <div className="flex items-center gap-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex-wrap animate-fadeIn">
            <span className="text-xs font-bold text-amber-900">Диапазон:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">С:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-amber-300 text-xs font-bold text-slate-800 rounded-lg px-2.5 py-1.5 outline-none shadow-2xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">По:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-amber-300 text-xs font-bold text-slate-800 rounded-lg px-2.5 py-1.5 outline-none shadow-2xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI КАРТОЧКИ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Выручка</span>
            <span>💰</span>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900">{totalRevenue.toLocaleString()} zł</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">
            Заказов: {filteredOrders.length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Заказов</span>
            <span>📦</span>
          </div>
          <div className="text-lg sm:text-2xl font-black text-blue-600">{filteredOrders.length}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">
            Выполнено
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Средний чек</span>
            <span>💳</span>
          </div>
          <div className="text-lg sm:text-2xl font-black text-indigo-600">{averageCheck} zł</div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">
            На одну уборку
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Клиентов</span>
            <span>👥</span>
          </div>
          <div className="text-lg sm:text-2xl font-black text-teal-600">{uniqueClientsCount}</div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">
            Активных в периоде
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Повторные</span>
            <span>🔄</span>
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-600">{repeatOrdersPercent}%</div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">
            Доля LTV клиентов
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 rounded-2xl border border-emerald-700 shadow-xs text-white">
          <div className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Прибыль (чистая)</span>
            <span>💎</span>
          </div>
          <div className="text-lg sm:text-2xl font-black">{estimatedProfit > 0 ? estimatedProfit.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) : 0} zł</div>
          <div className="text-[10px] text-emerald-200 font-medium mt-1">
            После ЗП и химии
          </div>
        </div>
      </div>

      {activeTab === 'CHARTS' ? (
        <div className="space-y-6">
          {/* ГЛАВНЫЙ ГРАФИК: ДИНАМИКА ВЫРУЧКИ ВО ВРЕМЕНИ */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>📈</span>
                  <span>Динамика выручки за выбранный период</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Интерактивный график. Наведите курсор на точку для точных данных
                </p>
              </div>
              <div className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
                Периодов в графике: {timelineData.length}
              </div>
            </div>

            {/* SVG График */}
            <div className="relative w-full overflow-x-auto select-none pt-4 pb-2">
              {timelineData.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  Нет данных о заказах за этот период
                </div>
              ) : (
                <div className="min-w-[700px] relative">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-56 overflow-visible"
                  >
                    <defs>
                      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Горизонтальные линии сетки */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                      const y = chartHeight - paddingY - pct * (chartHeight - paddingY * 2);
                      const val = Math.round(maxRevenue * pct);
                      return (
                        <g key={idx}>
                          <line
                            x1={paddingX}
                            y1={y}
                            x2={chartWidth - paddingX}
                            y2={y}
                            stroke="#f1f5f9"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                          />
                          <text
                            x={paddingX - 8}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="9"
                            fill="#94a3b8"
                            fontWeight="bold"
                          >
                            {val.toLocaleString()} zł
                          </text>
                        </g>
                      );
                    })}

                    {/* Заливка области графика */}
                    {svgAreaPath && (
                      <path d={svgAreaPath} fill="url(#areaGradient)" />
                    )}

                    {/* Основная линия графика */}
                    {svgPath && (
                      <path
                        d={svgPath}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Точки на графике */}
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={hoveredPoint?.label === p.label ? "6" : "3.5"}
                          fill="#ffffff"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                          className="transition-all cursor-pointer hover:r-7"
                          onMouseEnter={() => setHoveredPoint(p)}
                        />
                        {/* Подписи оси X */}
                        {(i === 0 || i === points.length - 1 || i % Math.max(1, Math.floor(points.length / 8)) === 0) && (
                          <text
                            x={p.x}
                            y={chartHeight - 6}
                            textAnchor="middle"
                            fontSize="9"
                            fill="#64748b"
                            fontWeight="600"
                          >
                            {p.label}
                          </text>
                        )}
                      </g>
                    ))}
                  </svg>

                  {/* Всплывающий интерактивный тултип */}
                  {hoveredPoint && (
                    <div
                      className="absolute bg-slate-900/95 backdrop-blur-xs text-white p-3 rounded-xl shadow-xl pointer-events-none text-xs space-y-1 transition-all z-20 border border-slate-700"
                      style={{
                        left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                        top: `${(hoveredPoint.y / chartHeight) * 100}%`,
                        transform: 'translate(-50%, -125%)',
                      }}
                    >
                      <div className="font-bold text-slate-300 text-[11px] pb-1 border-b border-slate-700">
                        🗓 {hoveredPoint.label}
                      </div>
                      <div className="font-extrabold text-sm text-emerald-400">
                        {hoveredPoint.revenue.toLocaleString()} zł
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Уборок выполнено: <span className="font-bold text-white">{hoveredPoint.ordersCount} шт.</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* СЕТКА ГРАФИКОВ: КАНАЛЫ + УСЛУГИ + ТИПЫ КЛИЕНТОВ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. КАНАЛЫ ПРИВЛЕЧЕНИЯ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>📡</span>
                    <span>Каналы привлечения</span>
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">По выручке</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-4">
                  Откуда пришли клиенты и сколько денег принес каждый источник
                </p>

                <div className="space-y-3">
                  {channelStats.map((ch) => (
                    <div key={ch.name} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{ch.icon}</span>
                          <span>{ch.name}</span>
                        </span>
                        <div className="text-right">
                          <span className="font-extrabold text-slate-900">{ch.revenue.toLocaleString()} zł</span>
                          <span className="text-[10px] text-slate-400 ml-1.5 font-medium">({ch.percent.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${ch.percent}%`,
                            backgroundColor: ch.color,
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 text-right">
                        Заказов: {ch.count} шт. • Ср. чек: {ch.count > 0 ? Math.round(ch.revenue / ch.count) : 0} zł
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. СТРУКТУРА УСЛУГ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>🧹</span>
                    <span>Виды уборок и услуг</span>
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">Доли услуг</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-4">
                  Распределение заказов по генеральным, стандартным и спец. услугам
                </p>

                <div className="space-y-3">
                  {serviceStats.map((srv) => (
                    <div key={srv.name} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 truncate pr-2">
                          {srv.name}
                        </span>
                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-slate-900">{srv.revenue.toLocaleString()} zł</span>
                          <span className="text-[10px] text-slate-400 ml-1 font-medium">({srv.percent.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${srv.percent}%`,
                            backgroundColor: srv.color,
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 text-right">
                        Заказов: {srv.count} шт.
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. ТИПЫ КЛИЕНТОВ (LTV) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>💎</span>
                    <span>Сегменты клиентов</span>
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">Лояльность</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-4">
                  Постоянные клиенты, абонементы и новички
                </p>

                <div className="space-y-3">
                  {clientTypeStats.map((ct) => (
                    <div key={ct.name} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">
                          {ct.name}
                        </span>
                        <div className="text-right">
                          <span className="font-extrabold text-slate-900">{ct.revenue.toLocaleString()} zł</span>
                          <span className="text-[10px] text-slate-400 ml-1 font-medium">({ct.percent.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${ct.percent}%`,
                            backgroundColor: ct.color,
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 text-right">
                        {ct.count} заказов
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* РЕЙТИНГ ТОП-10 КЛИЕНТОВ ЗА ПЕРИОД */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>🏆</span>
                  <span>ТОП-10 клиентов периода по сумме оплат (LTV)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Клиенты, принесшие максимальную выручку за выбранный период
                </p>
              </div>
              <span className="text-xs font-bold text-blue-600">
                Всего клиентов: {uniqueClientsCount}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/60 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5 pl-5"># Клиент</th>
                    <th className="p-3.5">Телефон</th>
                    <th className="p-3.5">Канал</th>
                    <th className="p-3.5">Адрес</th>
                    <th className="p-3.5 text-center">Заказов в периоде</th>
                    <th className="p-3.5 text-right pr-5 font-bold text-slate-900">Выручка (LTV)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topClients.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 pl-5 font-bold text-slate-900 flex items-center gap-2">
                        <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</span>
                        <span>{c.name}</span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">{c.phone || '—'}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {c.channel}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 max-w-[200px] truncate">{c.address || 'Варшава'}</td>
                      <td className="p-3.5 text-center font-bold text-blue-600">{c.count} шт.</td>
                      <td className="p-3.5 text-right pr-5 font-black text-emerald-600 text-sm">
                        {c.total.toLocaleString()} zł
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ВКЛАДКА: ЗАРПЛАТЫ КЛИНЕРОВ */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Фонд начисленной ЗП</div>
              <div className="text-2xl font-extrabold text-indigo-600">{totalSalaryFund.toFixed(0)} zł</div>
              <div className="text-[11px] font-semibold text-slate-400 mt-2">
                За {filteredOrders.length} выполненных заказов
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Наличные на руках</div>
              <div className="text-2xl font-extrabold text-amber-600">{totalCashCollected.toFixed(0)} zł</div>
              <div className="text-[11px] font-semibold text-slate-400 mt-2">
                Собрано клинерами наличными
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">К переводу на карты</div>
              <div className="text-2xl font-extrabold text-emerald-600">
                {(totalSalaryFund - totalCashCollected).toFixed(0)} zł
              </div>
              <div className="text-[11px] font-semibold text-slate-400 mt-2">
                Итоговый баланс выплат
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800">
                👥 Расчет выплат клинерам за выбранный период
              </h2>
              <span className="text-[11px] text-slate-500 font-bold">
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
                        Остальные {cleanerStats.filter(c => c.ordersCount === 0).length} сотрудников пока без заказов в выбранном периоде
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
