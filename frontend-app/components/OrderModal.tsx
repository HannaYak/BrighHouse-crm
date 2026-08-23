"use client";
import React, { useState, useEffect } from 'react';
import { calculateBrightHouseOrder, ServiceType } from '../lib/calculator';

export interface OrderDetail {
  id?: string;
  orderNumber?: string;
  date: string;
  startTime: string;
  endTime: string;
  timeSlot?: string;
  serviceType: ServiceType;
  areaM2: number;
  roomsCount: number;
  bathroomsCount: number;
  windowsCount: number;

  // Дополнительные услуги
  hasOven: boolean;
  hasFridge: boolean;
  hasFridgeFreeze: boolean;
  hasMicrowave: boolean;
  hasBalcony: boolean;
  hasKitchenClosets: boolean;
  hasStairs: boolean;
  hasSteamer: boolean;
  hasDishesHours: number;
  hasIroningHours: number;
  hasVacuum: boolean;
  hasPets: boolean;
  hasKeys: boolean;

  // Химчистка
  drySofa2: number;
  drySofa3: number;
  drySofaCorner4: number;
  dryArmchair: number;
  dryMattressSide: number;

  clientName: string;
  clientPhone: string;
  addressLine1: string;
  addressLine2?: string;
  price: number;
  cleanersCount: number;
  assignedCleaners: { id: number; name: string; phone?: string; tags?: string[]; district?: string }[];
  notes?: string;
}

interface OrderModalProps {
  order: OrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedOrder: OrderDetail) => void;
}

const serviceTitles: Record<ServiceType, string> = {
  STANDARD: 'Стандарт',
  STANDARD_PLUS: 'Стандарт +',
  GENERAL: 'Генеральная',
  AFTER_REPAIR: 'После ремонта',
};

export default function OrderModal({ order, isOpen, onClose, onSave }: OrderModalProps) {
  if (!isOpen) return null;

  const [form, setForm] = useState<OrderDetail>(
    order || {
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '13:00',
      serviceType: 'STANDARD',
      areaM2: 45,
      roomsCount: 2,
      bathroomsCount: 1,
      windowsCount: 0,
      hasOven: false,
      hasFridge: false,
      hasFridgeFreeze: false,
      hasMicrowave: false,
      hasBalcony: false,
      hasKitchenClosets: false,
      hasStairs: false,
      hasSteamer: false,
      hasDishesHours: 0,
      hasIroningHours: 0,
      hasVacuum: false,
      hasPets: false,
      hasKeys: false,
      drySofa2: 0,
      drySofa3: 0,
      drySofaCorner4: 0,
      dryArmchair: 0,
      dryMattressSide: 0,
      clientName: '',
      clientPhone: '',
      addressLine1: '',
      addressLine2: '',
      price: 200,
      cleanersCount: 1,
      assignedCleaners: [],
      notes: '',
    }
  );

  const [allCleaners, setAllCleaners] = useState<any[]>([]);
  const [durationText, setDurationText] = useState('3 ч');
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Загрузка списка клинеров
  useEffect(() => {
    fetch('/api/cleaners')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAllCleaners(data))
      .catch((err) => console.error('Ошибка загрузки клинеров:', err));
  }, []);

  // Автоматический пересчёт времени и стоимости
  useEffect(() => {
    const res = calculateBrightHouseOrder({
      serviceType: form.serviceType,
      roomsCount: form.roomsCount,
      bathroomsCount: form.bathroomsCount,
      areaM2: form.areaM2,
      windowsCount: form.windowsCount,
      hasOven: form.hasOven,
      hasFridge: form.hasFridge,
      hasFridgeFreeze: form.hasFridgeFreeze,
      hasMicrowave: form.hasMicrowave,
      hasBalcony: form.hasBalcony,
      hasKitchenClosets: form.hasKitchenClosets,
      hasStairs: form.hasStairs,
      hasSteamer: form.hasSteamer,
      hasDishesHours: form.hasDishesHours,
      hasIroningHours: form.hasIroningHours,
      hasVacuum: form.hasVacuum,
      hasPets: form.hasPets,
      drySofa2: form.drySofa2,
      drySofa3: form.drySofa3,
      drySofaCorner4: form.drySofaCorner4,
      dryArmchair: form.dryArmchair,
      dryMattressSide: form.dryMattressSide,
      cleanersCount: Math.max(1, form.assignedCleaners.length),
      startTime: form.startTime || '10:00',
    });

    setForm((prev) => ({
      ...prev,
      price: res.totalPrice,
      endTime: res.endTime,
      cleanersCount: Math.max(1, form.assignedCleaners.length),
    }));
    setDurationText(res.formattedDuration);
  }, [
    form.serviceType,
    form.roomsCount,
    form.bathroomsCount,
    form.areaM2,
    form.windowsCount,
    form.hasOven,
    form.hasFridge,
    form.hasFridgeFreeze,
    form.hasMicrowave,
    form.hasBalcony,
    form.hasKitchenClosets,
    form.hasStairs,
    form.hasSteamer,
    form.hasDishesHours,
    form.hasIroningHours,
    form.hasVacuum,
    form.hasPets,
    form.drySofa2,
    form.drySofa3,
    form.drySofaCorner4,
    form.dryArmchair,
    form.dryMattressSide,
    form.assignedCleaners.length,
    form.startTime,
  ]);

  // Умный фильтр клинеров
  const eligibleCleaners = allCleaners.filter((cleaner) => {
    const tags = cleaner.tags || [];
    if (form.hasPets && tags.includes('аллергия_на_животных')) return false;
    if ((form.serviceType === 'GENERAL' || form.serviceType === 'AFTER_REPAIR') && tags.includes('только_поддерживающая')) return false;
    const hasDryClean = form.drySofa2 + form.drySofa3 + form.drySofaCorner4 + form.dryArmchair + form.dryMattressSide > 0;
    if (hasDryClean && !tags.includes('химчистка')) return false;
    return true;
  });

  const toggleCleaner = (cleaner: any) => {
    const exists = form.assignedCleaners.some((c) => c.id === cleaner.id);
    if (exists) {
      setForm({
        ...form,
        assignedCleaners: form.assignedCleaners.filter((c) => c.id !== cleaner.id),
      });
      setWarningMessage(null);
    } else {
      // Проверка несовместимости
      if (cleaner.incompatibleWith && cleaner.incompatibleWith.length > 0) {
        const conflict = form.assignedCleaners.find((c) => cleaner.incompatibleWith.includes(c.name));
        if (conflict) {
          setWarningMessage(`⚠️ Несовместимость: ${cleaner.name} не работает в паре с ${conflict.name}`);
          return;
        }
      }
      setWarningMessage(null);
      setForm({
        ...form,
        assignedCleaners: [...form.assignedCleaners, cleaner],
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl h-[92vh] max-h-[880px] flex flex-col overflow-hidden">
        
        {/* Шапка */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded">
              {form.orderNumber || 'НОВЫЙ ЗАКАЗ'}
            </span>
            <h2 className="text-base font-bold text-slate-800">
              {form.clientName ? `Заказ: ${form.clientName}` : 'Новая заявка BrightHouse'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold">
            ✕
          </button>
        </div>

        {/* Двухколоночный контент */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Левая часть: Тариф, Параметры, Допы и Химчистка (55%) */}
          <div className="w-[55%] p-6 border-r border-slate-100 overflow-y-auto space-y-4">
            
            {/* Выбор тарифа */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Тариф уборки</label>
              <div className="grid grid-cols-4 gap-2">
                {(['STANDARD', 'STANDARD_PLUS', 'GENERAL', 'AFTER_REPAIR'] as ServiceType[]).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setForm({ ...form, serviceType: t })}
                    className={`py-2 px-1 text-center text-xs font-semibold rounded-lg border transition ${
                      form.serviceType === t
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {serviceTitles[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Метраж, Комнаты, Санузлы, Окна */}
            <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Метраж ($м^2$)</label>
                <input
                  type="number"
                  value={form.areaM2}
                  onChange={(e) => setForm({ ...form, areaM2: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Комнат</label>
                <input
                  type="number"
                  value={form.roomsCount}
                  onChange={(e) => setForm({ ...form, roomsCount: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Санузлов</label>
                <input
                  type="number"
                  value={form.bathroomsCount}
                  onChange={(e) => setForm({ ...form, bathroomsCount: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Окон (35 zł)</label>
                <input
                  type="number"
                  value={form.windowsCount}
                  onChange={(e) => setForm({ ...form, windowsCount: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Дополнительные услуги BrightHouse */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Дополнительные опции</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k: 'hasOven', label: '🍳 Духовка (45 zł)' },
                  { k: 'hasFridge', label: '❄️ Холодильник (35 zł)' },
                  { k: 'hasFridgeFreeze', label: '🧊 Холод.+мороз. (50 zł)' },
                  { k: 'hasMicrowave', label: '📡 Микроволновка (20 zł)' },
                  { k: 'hasBalcony', label: '🌿 Балкон (35 zł)' },
                  { k: 'hasKitchenClosets', label: '🗄️ Кух. шкафы (100 zł)' },
                  { k: 'hasStairs', label: '🪜 Лестница (30 zł)' },
                  { k: 'hasSteamer', label: '💨 Пароочиститель (75 zł)' },
                  { k: 'hasVacuum', label: '🔌 Доставка пылесоса (30 zł)' },
                  { k: 'hasPets', label: '🐾 Есть животные (Аллергия)' },
                  { k: 'hasKeys', label: '🔑 Забрать/отдать ключи' },
                ].map(({ k, label }) => {
                  const active = form[k as keyof OrderDetail];
                  return (
                    <button
                      type="button"
                      key={k}
                      onClick={() => setForm({ ...form, [k]: !active })}
                      className={`px-2 py-2 text-left text-xs font-medium rounded-lg border transition flex items-center justify-between ${
                        active
                          ? 'bg-blue-50 border-brand-500 text-brand-700 font-semibold shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{label}</span>
                      <span>{active ? '✓' : ''}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Блок химчистки */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3 space-y-2">
              <span className="text-[11px] font-bold text-amber-900 uppercase block">🛋️ Химчистка мебели</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-amber-800 block">Диван 2-мест. (180 zł)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.drySofa2}
                    onChange={(e) => setForm({ ...form, drySofa2: Number(e.target.value) })}
                    className="w-full bg-white border border-amber-300 rounded p-1 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-amber-800 block">Диван 3-мест. (200 zł)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.drySofa3}
                    onChange={(e) => setForm({ ...form, drySofa3: Number(e.target.value) })}
                    className="w-full bg-white border border-amber-300 rounded p-1 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-amber-800 block">Диван угловой (220 zł)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.drySofaCorner4}
                    onChange={(e) => setForm({ ...form, drySofaCorner4: Number(e.target.value) })}
                    className="w-full bg-white border border-amber-300 rounded p-1 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Клиент и Адрес */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Имя клиента</label>
                  <input
                    type="text"
                    value={form.clientName}
                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Телефон</label>
                  <input
                    type="text"
                    value={form.clientPhone}
                    onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Улица, дом</label>
                  <input
                    type="text"
                    value={form.addressLine1}
                    onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Кв / Офис</label>
                  <input
                    type="text"
                    value={form.addressLine2 || ''}
                    onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Правая часть: Тайминг, Бригада, Напарники, Итог (45%) */}
          <div className="w-[45%] p-6 flex flex-col justify-between bg-slate-50/40 overflow-y-auto space-y-4">
            <div className="space-y-4">
              
              {/* Дата, Время старта и Время финиша (Авто) */}
              <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Дата</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Старт</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Финиш (Авто)</label>
                  <input
                    type="text"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg p-1.5 text-xs font-extrabold"
                  />
                </div>
              </div>

              {/* Индикатор длительности уборки */}
              <div className="flex items-center justify-between px-3 py-2 bg-blue-50/80 border border-blue-200 rounded-lg text-xs font-semibold text-blue-900">
                <span>⏱️ Оценочное время на объекте:</span>
                <span className="font-bold bg-white px-2 py-0.5 rounded border border-blue-200">{durationText}</span>
              </div>

              {warningMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-bold">
                  {warningMessage}
                </div>
              )}

              {/* Назначение клинеров (Умный фильтр) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Бригада ({form.assignedCleaners.length})</label>
                  <span className="text-[10px] text-slate-400">Доступно: {eligibleCleaners.length}</span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {eligibleCleaners.map((cleaner) => {
                    const isSelected = form.assignedCleaners.some((c) => c.id === cleaner.id);
                    return (
                      <button
                        type="button"
                        key={cleaner.id}
                        onClick={() => toggleCleaner(cleaner)}
                        className={`w-full px-3 py-2 rounded-lg text-xs flex items-center justify-between border transition ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>🙋‍♀️ {cleaner.name}</span>
                        <span className="text-[10px] text-slate-400">📍 {cleaner.district}</span>
                      </button>
                    );
                  })}
                </div>

                {form.assignedCleaners.length > 1 && (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 font-medium">
                    👥 Состав пары: {form.assignedCleaners.map((c) => c.name).join(' + ')}
                  </div>
                )}
              </div>

              {/* Заметки и ТЗ */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ТЗ / Особенности клиента</label>
                <textarea
                  rows={2}
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Код от подъезда, кровати не трогать..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Итоговая стоимость и кнопка сохранения */}
            <div className="border-t border-slate-200 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Итоговая стоимость:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-24 bg-white border border-slate-300 rounded-lg p-1.5 text-right font-extrabold text-slate-900 text-base"
                  />
                  <span className="text-xs font-bold text-slate-600">zł</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onSave({
                    ...form,
                    timeSlot: `${form.startTime} — ${form.endTime}`,
                  });
                  onClose();
                }}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition"
              >
                💾 Сохранить и передать клинерам
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
