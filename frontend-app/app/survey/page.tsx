"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Candidate {
  id: string;
  clientName: string;
  phone: string | null;
  channel: 'TELEGRAM' | 'INSTAGRAM' | 'WHATSAPP';
  externalId: string;
  conversationId: string | null;
  source: string;
  orderNumber?: string | null;
  price?: number | null;
  orderDate?: string | null;
  status?: string | null;
  lastMessage?: string | null;
  createdAt: string;
}

interface SurveyStats {
  sentCount: number;
  repliedCount: number;
  responseRate: number;
  breakdown: {
    price: number;
    date: number;
    later: number;
    other: number;
  };
  recentResponses: Array<{
    id: string;
    conversationId: string;
    clientName: string;
    channel: string;
    text: string;
    date: string;
  }>;
}

export default function SurveyMarketingPage() {
  const [activeTab, setActiveTab] = useState<'survey' | 'stats' | 'consulting'>('survey');
  const [days, setDays] = useState<number>(7);
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Выбранные кандидаты
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Кастомный текст сообщения
  const [messageTemplate, setMessageTemplate] = useState<string>(
    'Здравствуйте, {name}! 🌸\n\n' +
    'Заметили, что вы интересовались уборкой и скидкой от BrightHouse, но пока не завершили заказ.\n\n' +
    'Подскажите, пожалуйста, что помешало оформить? Нам очень важно ваше мнение, чтобы сделать сервис удобнее 🙏'
  );

  // Модалка подтверждения и статус отправки
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number } | null>(null);
  const [sendResult, setSendResult] = useState<{ successCount: number; failCount: number } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        days: days.toString(),
        type: filterType,
        search,
      });
      const res = await fetch(`/api/marketing/survey?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
        setStats(data.stats || null);
      }
    } catch (e) {
      console.error('Ошибка загрузки данных опроса:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [days, filterType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Выбор всех или снятие выбора
  const handleToggleSelectAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.id)));
    }
  };

  const handleToggleCandidate = (id: string) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  // Отправка опроса
  const handleExecuteSend = async () => {
    const selectedList = candidates.filter((c) => selectedIds.has(c.id));
    if (selectedList.length === 0) return;

    setSending(true);
    setSendProgress({ current: 0, total: selectedList.length });

    try {
      const res = await fetch('/api/marketing/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidates: selectedList,
          messageTemplate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSendResult({
          successCount: data.successCount || 0,
          failCount: data.failCount || 0,
        });
        setSelectedIds(new Set());
        loadData();
      } else {
        alert('Ошибка при выполнении рассылки');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка сети при отправке опроса');
    } finally {
      setSending(false);
      setConfirmModalOpen(false);
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-4 pt-4">
      {/* Шапка страницы */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎯</span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Опрос клиентов: Брошенные заказы и скидки
            </h1>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Инструмент точечного выяснения причин: почему клиенты нажали «Оплатить / Забронировать» или проявили интерес к скидке, но не купили.
          </p>
        </div>

        {/* Защитный бейдж безопасности */}
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold px-3 py-2 rounded-2xl">
          <span className="text-base">🛡️</span>
          <span>Безопасный режим: отправка строго по выбранным галочками контактам!</span>
        </div>
      </div>

      {/* Вкладки навигации */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('survey')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            activeTab === 'survey'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>📋</span> Целевые клиенты и рассылка
          {candidates.length > 0 && (
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
              {candidates.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            activeTab === 'stats'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>📊</span> Результаты и ответы клиентов
          {stats?.repliedCount ? (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-black">
              {stats.repliedCount}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab('consulting')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            activeTab === 'consulting'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <span>💡</span> Разбор: Почему жмут, но не покупают?
        </button>
      </div>

      {/* Уведомление об успешной отправке */}
      {sendResult && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex items-center justify-between text-xs text-emerald-900 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <div>
              <p className="font-extrabold">Опрос успешно отправлен!</p>
              <p className="text-[11px] text-emerald-700">
                Доставлено: <b>{sendResult.successCount}</b> | Ошибок: <b>{sendResult.failCount}</b>. Ответы клиентов будут появляться во вкладке «Результаты» и в CRM чатах!
              </p>
            </div>
          </div>
          <button
            onClick={() => setSendResult(null)}
            className="text-emerald-700 hover:text-emerald-950 font-black text-xs px-2 py-1"
          >
            ✕ Закрыть
          </button>
        </div>
      )}

      {/* ВКЛАДКА 1: ЦЕЛЕВЫЕ КЛИЕНТЫ И РАССЫЛКА */}
      {activeTab === 'survey' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Левая часть: Фильтры и Таблица кандидатов (8 колонок) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Панель фильтрации */}
            <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Выбор периода */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  {[
                    { label: '3 дня', val: 3 },
                    { label: '7 дней (неделя)', val: 7 },
                    { label: '14 дней', val: 14 },
                    { label: '30 дней', val: 30 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      onClick={() => setDays(p.val)}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        days === p.val
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Выбор категории */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2"
                >
                  <option value="all">🔍 Все не завершившие клиенты</option>
                  <option value="unpaid_orders">📦 Заказы без оплаты / брони</option>
                  <option value="warm_convs">💬 Диалоги без заказа (Думают/Напомнить)</option>
                </select>
              </div>

              {/* Поисковая строка */}
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Поиск по имени, телефону или тексту..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-800"
                />
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                >
                  Найти
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    loadData();
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition"
                >
                  Сброс
                </button>
              </form>
            </div>

            {/* Таблица кандидатов */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={candidates.length > 0 && selectedIds.size === candidates.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                  <span className="text-xs font-extrabold text-slate-800">
                    {selectedCount > 0 ? (
                      <span className="text-brand-600">
                        Выбрано: {selectedCount} из {candidates.length}
                      </span>
                    ) : (
                      <span>Всего кандидатов: {candidates.length} (отметьте галочками нужных)</span>
                    )}
                  </span>
                </div>

                {selectedCount > 0 && (
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    Снять все галочки
                  </button>
                )}
              </div>

              {loading ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  Поиск клиентов, интересовавшихся оплатой/скидкой...
                </div>
              ) : candidates.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <div className="text-3xl">🎉</div>
                  <p className="text-xs font-bold text-slate-700">Неоплаченных клиентов за этот период не найдено!</p>
                  <p className="text-[11px] text-slate-400">Попробуйте увеличить период до 14 или 30 дней.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {candidates.map((cand) => {
                    const isSelected = selectedIds.has(cand.id);
                    return (
                      <div
                        key={cand.id}
                        onClick={() => handleToggleCandidate(cand.id)}
                        className={`p-3.5 flex items-start gap-3 transition cursor-pointer hover:bg-slate-50 ${
                          isSelected ? 'bg-brand-50/50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // обрабатывается кликом по строке
                          className="w-4 h-4 mt-1 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900">{cand.clientName}</span>

                            {/* Канал */}
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                cand.channel === 'TELEGRAM'
                                  ? 'bg-sky-100 text-sky-800'
                                  : cand.channel === 'INSTAGRAM'
                                  ? 'bg-pink-100 text-pink-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {cand.channel === 'TELEGRAM' && '✈️ Telegram'}
                              {cand.channel === 'INSTAGRAM' && '📸 Instagram'}
                              {cand.channel === 'WHATSAPP' && '💬 WhatsApp'}
                            </span>

                            {/* Телефон */}
                            {cand.phone && (
                              <span className="text-[11px] font-mono text-slate-500 font-semibold">
                                {cand.phone}
                              </span>
                            )}

                            {/* Бейдж статуса/источника */}
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                              {cand.source} {cand.price ? `(${cand.price} zł)` : ''}
                            </span>
                          </div>

                          {/* Последнее сообщение / комментарий */}
                          <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                            «{cand.lastMessage || 'Нет сообщений'}»
                          </p>

                          <div className="text-[10px] text-slate-400 flex items-center gap-3">
                            <span>Зафиксировано: {new Date(cand.createdAt).toLocaleDateString('ru-RU')}</span>
                            {cand.orderNumber && <span>Заказ #{cand.orderNumber}</span>}
                          </div>
                        </div>

                        {/* Ссылка на диалог */}
                        {cand.conversationId && (
                          <Link
                            href={`/chats?openId=${cand.conversationId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] font-bold text-brand-600 hover:text-brand-800 bg-brand-50 px-2.5 py-1 rounded-xl transition"
                          >
                            💬 Чат
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Правая часть: Превью рассылки и интерактивных кнопок (4 колонки) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs space-y-4 sticky top-20">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  ✉️ Настройка и предпросмотр
                </h3>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                  Интерактивный
                </span>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">
                  Текст сообщения (переменная {'{name}'} подставит имя)
                </label>
                <textarea
                  rows={5}
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 leading-relaxed font-medium"
                />
              </div>

              {/* Интерактивные варианты ответа */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase block">
                  Кнопки / Варианты ответов для клиента:
                </label>

                <div className="space-y-1.5">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2">
                    <span>1️⃣</span> 💰 Слишком высокая цена / дорого
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2">
                    <span>2️⃣</span> 📅 Не подошла дата или время
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2">
                    <span>3️⃣</span> ⏳ Мало 3-4 дня (хочу скидку на потом)
                  </div>
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-900 flex items-center gap-2">
                    <span>4️⃣</span> ✍️ Другой вариант (напишет свой ответ от руки)
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-normal pt-1">
                  💡 <b>Как это работает:</b> В Telegram клиент нажмет красивую инлайн-кнопку. При нажатии «Другой вариант» бот предложит написать причину текстом, и его ответ сразу появится у вас в чате CRM!
                </p>
              </div>

              {/* Кнопка отправки */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={selectedCount === 0 || sending}
                  onClick={() => setConfirmModalOpen(true)}
                  className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs transition shadow-md flex items-center justify-center gap-2 ${
                    selectedCount > 0 && !sending
                      ? 'bg-brand-600 hover:bg-brand-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>🚀</span>
                  <span>
                    {selectedCount > 0
                      ? `Отправить опрос выбранным (${selectedCount})`
                      : 'Отметьте хотя бы одного клиента слева'}
                  </span>
                </button>
                <p className="text-[10px] text-center text-slate-400 mt-2 font-semibold">
                  🛡️ Защита от спама: рассылка уйдет строго по отмеченным контактам
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ВКЛАДКА 2: РЕЗУЛЬТАТЫ И СТАТИСТИКА */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* KPI Карточки */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                📨 Всего отправлено опросов
              </span>
              <div className="text-3xl font-black text-slate-900">{stats?.sentCount || 0}</div>
              <p className="text-[11px] text-slate-500 mt-1">Клиентам, бросившим оформление</p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block mb-1">
                💬 Получено ответов
              </span>
              <div className="text-3xl font-black text-emerald-600">{stats?.repliedCount || 0}</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Конверсия в ответ: <b>{stats?.responseRate || 0}%</b>
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs">
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider block mb-1">
                ✍️ Свои ответы от руки
              </span>
              <div className="text-3xl font-black text-purple-600">{stats?.breakdown?.other || 0}</div>
              <p className="text-[11px] text-slate-500 mt-1">Написали развернутую причину</p>
            </div>
          </div>

          {/* Распределение причин отказа */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              📊 Почему клиенты не оплатили: распределение причин
            </h2>

            <div className="space-y-3">
              {[
                {
                  label: '💰 Дорого / не подошла цена',
                  count: stats?.breakdown?.price || 0,
                  color: 'bg-rose-500',
                },
                {
                  label: '📅 Не подошла дата или время',
                  count: stats?.breakdown?.date || 0,
                  color: 'bg-amber-500',
                },
                {
                  label: '⏳ Мало 3-4 дня (хотят скидку на потом)',
                  count: stats?.breakdown?.later || 0,
                  color: 'bg-sky-500',
                },
                {
                  label: '✍️ Другой вариант (свой ответ от руки)',
                  count: stats?.breakdown?.other || 0,
                  color: 'bg-purple-500',
                },
              ].map((item, idx) => {
                const total = stats?.repliedCount || 1;
                const percent = stats?.repliedCount ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{item.label}</span>
                      <span>
                        {item.count} чел. ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div
                        className={`${item.color} h-full transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Недавние ответы клиентов */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              💬 Недавние ответы клиентов
            </h3>

            {stats?.recentResponses && stats.recentResponses.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {stats.recentResponses.map((resp) => (
                  <div key={resp.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{resp.clientName}</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(resp.date).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {resp.text}
                      </p>
                    </div>

                    <Link
                      href={`/chats?openId=${resp.conversationId}`}
                      className="text-xs font-bold text-brand-600 hover:text-brand-800 bg-brand-50 px-3 py-1.5 rounded-xl whitespace-nowrap transition"
                    >
                      💬 Ответить в чате
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                Пока ответов не поступало. Отправьте опрос кандидатам во вкладке «Целевые клиенты»!
              </p>
            )}
          </div>
        </div>
      )}

      {/* ВКЛАДКА 3: БИЗНЕС-РАЗБОР И КОНСУЛЬТИРОВАНИЕ */}
      {activeTab === 'consulting' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💡</span>
              <h2 className="text-lg font-black text-amber-950">
                Почему люди нажимали «Оплатить», но не завершили покупку?
              </h2>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              Вы заметили точную проблему: <b>много кликов на «Оплатить» или скидку, но маленький процент реальных заказов</b>. Давайте разберем, почему это происходит именно в клининговом бизнесе, виноват ли срок 3-4 дня и как исправить ситуацию.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Причина 1 */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">⏳</span>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  1. Срок действия скидки (3-4 дня)
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Клининг — это <b>не импульсный цифровой товар</b>, а визит людей в дом. Клиенту нужно быть дома, спланировать свой график или освободить квартиру.
              </p>
              <div className="bg-slate-50 p-3 rounded-2xl text-[11px] text-slate-700 space-y-1 border border-slate-100">
                <p>
                  <b>Что думает клиент:</b> <i>«О, скидка 20%! Хочу!»</i> 👉 Нажимает кнопку 👉 Видит: <i>«Скидка сгорит через 3 дня»</i> 👉 <i>«Но мне не нужна уборка в эту пятницу, я уезжаю / у меня ремонт. А заказать на через 2 недели по скидке я не знаю как»</i> 👉 <b>Закрывает страницу.</b>
                </p>
                <p className="text-emerald-700 font-bold pt-1">
                  ✅ <b>Решение:</b> Писать: <i>«Зафиксируйте скидку сейчас за 3 дня, а дату уборки выберите любую в течение 30-60 дней!»</i> Это снимает 80% страха не успеть.
                </p>
              </div>
            </div>

            {/* Причина 2 */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">💳</span>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  2. Страх 100% предоплаты до уборки
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                В Польше люди очень осторожно относятся к предоплате услуг на дому незнакомым компаниям. Если кнопка «Оплатить» требует сразу списать деньги с карты или перевести на счет — конверсия падает в 3-4 раза.
              </p>
              <div className="bg-slate-50 p-3 rounded-2xl text-[11px] text-slate-700 space-y-1 border border-slate-100">
                <p>
                  <b>Что думает клиент:</b> <i>«Я еще не видел, как они убирают, а вдруг клинер опоздает или испортит диван? Зачем мне платить вперед?»</i>
                </p>
                <p className="text-emerald-700 font-bold pt-1">
                  ✅ <b>Решение:</b> Дать выбор: <i>«Оплата ПОСЛЕ уборки и проверки качества (BLIK, картой или наличными)»</i>. Это увеличивает конверсию первичных заявок на 40-70%.
                </p>
              </div>
            </div>

            {/* Причина 3 */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  3. Трение при оплате (нет BLIK в 1 клик)
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Польские пользователи привыкли к моментальному вводу 6 цифр BLIK. Если после кнопки «Оплатить» им показывают длинный банковский счет IBAN или просят ждать ответа менеджера в WhatsApp — интерес угасает за 2 минуты.
              </p>
              <div className="bg-slate-50 p-3 rounded-2xl text-[11px] text-slate-700 space-y-1 border border-slate-100">
                <p className="text-emerald-700 font-bold">
                  ✅ <b>Решение:</b> Указывать быстрый перевод BLIK на номер телефона: <code>888 742 534</code> или подключить мгновенный шлюз.
                </p>
              </div>
            </div>

            {/* Причина 4 */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔍</span>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  4. Ожидание «подводных камней» в чеке
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Клиенты боятся, что за скидкой 200 zł последуют наценки за дорогу (2-я зона), окна, духовку, химию и стремянку, и итоговый чек станет 500+ zł.
              </p>
              <div className="bg-slate-50 p-3 rounded-2xl text-[11px] text-slate-700 space-y-1 border border-slate-100">
                <p className="text-emerald-700 font-bold">
                  ✅ <b>Решение:</b> Всегда крупно писать: <i>«Эко-химия, инвентарь и доезд по всей Варшаве уже включены в цену!»</i>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ БЕЗОПАСНОЙ ОТПРАВКИ */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-brand-600">
              <span className="text-3xl">🛡️</span>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Подтверждение безопасной отправки
                </h3>
                <p className="text-[11px] text-slate-500">
                  Проверьте список получателей перед отправкой
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs text-amber-950 space-y-1">
              <p className="font-extrabold">
                ⚠️ Вы собираетесь отправить опрос {selectedCount} клиентам.
              </p>
              <p className="text-[11px] text-amber-800">
                Сообщения уйдут <b>только</b> этим отмеченным контактам. Никому другому сообщение не придет. Текущие диалоги и боты не нарушаются.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase">
                Получатели опроса ({selectedCount}):
              </span>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                {candidates
                  .filter((c) => selectedIds.has(c.id))
                  .map((c) => (
                    <div key={c.id} className="py-1 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800">{c.clientName}</span>
                      <span className="text-slate-500 font-mono">
                        {c.phone || c.channel}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {sending && sendProgress && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Отправка сообщений...</span>
                  <span>{sendProgress.current} из {sendProgress.total}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-600 h-full transition-all duration-300"
                    style={{
                      width: `${Math.round((sendProgress.current / sendProgress.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                disabled={sending}
                onClick={() => setConfirmModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 rounded-2xl transition"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={handleExecuteSend}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black py-3 rounded-2xl transition shadow-md flex items-center justify-center gap-2"
              >
                {sending ? 'Отправка...' : `✓ Да, отправить (${selectedCount})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
