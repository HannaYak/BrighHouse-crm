"use client";
import React, { useState, useEffect } from 'react';

export type ServiceType = 'STANDARD' | 'STANDARD_PLUS' | 'GENERAL' | 'AFTER_REPAIR';

export interface OrderDetail {
  id?: string;
  orderNumber?: string;
  date: string;
  timeSlot: string;
  serviceType: ServiceType;
  areaM2: number;
  roomsCount: number;
  bathroomsCount: number;
  windowsCount: number;
  
  // Доп. услуги
  hasOven: boolean;
  hasFridge: boolean;
  hasMicrowave: boolean;
  hasBalcony: boolean;
  hasDishes: boolean;
  hasIroning: boolean;
  hasVacuum: boolean;
  hasPets: boolean;
  hasKeys: boolean;

  clientName: string;
  clientPhone: string;
  addressLine1: string;
  addressLine2?: string;
  price: number;
  cleanersCount: number;
  assignedCleaners: { id: number; name: string; phone?: string }[];
  notes?: string;
}

interface OrderModalProps {
  order: OrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedOrder: OrderDetail) => void;
}

const serviceNames: Record<ServiceType, string> = {
  STANDARD: 'Стандартная',
  STANDARD_PLUS: 'Стандарт +',
  GENERAL: 'Генеральная',
  AFTER_REPAIR: 'После ремонта',
};

export default function OrderModal({ order, isOpen, onClose, onSave }: OrderModalProps) {
  if (!isOpen) return null;

  const [form, setForm] = useState<OrderDetail>(
    order || {
      date: new Date().toISOString().split('T')[0],
      timeSlot: '10:00 — 14:00',
      serviceType: 'STANDARD',
      areaM2: 45,
      roomsCount: 1,
      bathroomsCount: 1,
      windowsCount: 0,
      hasOven: false,
      hasFridge: false,
      hasMicrowave: false,
      hasBalcony: false,
      hasDishes: false,
      hasIroning: false,
      hasVacuum: false,
      hasPets: false,
      hasKeys: false,
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

  const [availableCleaners, setAvailableCleaners] = useState<{ id: number; name: string; district: string }[]>([]);

  useEffect(() => {
    // Подгружаем список доступных клинеров
    fetch('/api/cleaners')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAvailableCleaners(data))
      .catch(() => {
        setAvailableCleaners([
          { id: 1, name: 'Мария Сидорова', district: 'Mokotów' },
          { id: 2, name: 'Анна Ковальчук', district: 'Wola' },
          { id: 3, name: 'Елена Демченко', district: 'Praga' },
        ]);
      });
  }, []);

  // Автоматический калькулятор базовой цены
  useEffect(() => {
    let base = form.serviceType === 'STANDARD' ? 180 : form.serviceType === 'STANDARD_PLUS' ? 240 : form.serviceType === 'GENERAL' ? 380 : 500;
    if (form.areaM2 > 50) base += Math.floor((form.areaM2 - 50) / 10) * 25;
    if (form.windowsCount > 0) base += form.windowsCount * 30;
    if (form.hasOven) base += 45;
    if (form.hasFridge) base += 45;
    if (form.hasMicrowave) base += 25;
    if (form.hasBalcony) base += 50;
    if (form.hasDishes) base += 35;
    if (form.hasIroning) base += 50;
    if (form.hasVacuum) base += 30;
    setForm((prev) => ({ ...prev, price: base }));
  }, [
    form.serviceType,
    form.areaM2,
    form.windowsCount,
    form.hasOven,
    form.hasFridge,
    form.hasMicrowave,
    form.hasBalcony,
    form.hasDishes,
    form.hasIroning,
    form.hasVacuum,
  ]);

  const toggleCleaner = (cleaner: { id: number; name: string }) => {
    const exists = form.assignedCleaners.some((c) => c.id === cleaner.id);
    const updated = exists
      ? form.assignedCleaners.filter((c) => c.id !== cleaner.id)
      : [...form.assignedCleaners, cleaner];
    setForm({ ...form, assignedCleaners: updated, cleanersCount: Math.max(1, updated.length) });
  };

  const handleCheckbox = (key: keyof OrderDetail) => {
    setForm((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl h-[90vh] max-h-[850px] flex flex-col overflow-hidden">
        
        {/* Шапка */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded">
              {form.orderNumber || 'НОВЫЙ ЗАКАЗ'}
            </span>
            <h2 className="text-base font-bold text-slate-800">
              {form.clientName ? `Заказ: ${form.clientName}` : 'Оформление нового заказа'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold">
            ✕
          </button>
        </div>

        {/* Контент 2 колонки */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Левая часть: Параметры жилья и тип уборки (55%) */}
          <div className="w-[55%] p-6 border-r border-slate-100 overflow-y-auto space-y-4">
            
            {/* Тип уборки */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Тип уборки</label>
              <div className="grid grid-cols-4 gap-2">
                {(['STANDARD', 'STANDARD_PLUS', 'GENERAL', 'AFTER_REPAIR'] as ServiceType[]).map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setForm({ ...form, serviceType: type })}
                    className={`py-2 px-1 text-center text-xs font-semibold rounded-lg border transition ${
                      form.serviceType === type
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {serviceNames[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Метраж, Комнаты, Санузлы, Окна */}
            <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
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
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Окон (шт)</label>
                <input
                  type="number"
                  value={form.windowsCount}
                  onChange={(e) => setForm({ ...form, windowsCount: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Дополнительные опции (Чекбоксы) */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Дополнительные услуги</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k: 'hasOven', label: '🍳 Духовка' },
                  { k: 'hasFridge', label: '❄️ Холодильник' },
                  { k: 'hasMicrowave', label: '📡 СВЧ' },
                  { k: 'hasBalcony', label: '🌿 Балкон' },
                  { k: 'hasDishes', label: '🍽️ Посуда' },
                  { k: 'hasIroning', label: '👔 Глажка' },
                  { k: 'hasVacuum', label: '🔌 Нужен пылесос' },
                  { k: 'hasPets', label: '🐾 Есть животные' },
                  { k: 'hasKeys', label: '🔑 Забрать ключи' },
                ].map(({ k, label }) => {
                  const active = form[k as keyof OrderDetail];
                  return (
                    <button
                      type="button"
                      key={k}
                      onClick={() => handleCheckbox(k as keyof OrderDetail)}
                      className={`px-2.5 py-2 text-left text-xs font-medium rounded-lg border transition flex items-center justify-between ${
                        active
                          ? 'bg-blue-50 border-brand-500 text-brand-700 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{label}</span>
                      <span>{active ? '✓' : ''}</span>
                    </button>
                  );
                })}
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Телефон клиента</label>
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

          {/* Правая часть: Бригада, Дата, Время, Итог (45%) */}
          <div className="w-[45%] p-6 flex flex-col justify-between bg-slate-50/40 overflow-y-auto space-y-4">
            <div className="space-y-4">
              
              {/* Дата и Слот времени */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Дата уборки</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Время</label>
                  <input
                    type="text"
                    value={form.timeSlot}
                    onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Назначение клинеров / Бригада */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Бригада на заказ ({form.assignedCleaners.length})</label>
                  <span className="text-[10px] text-slate-400">Нажми, чтобы назначить</span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {availableCleaners.map((cleaner) => {
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

                {/* Отображение напарников */}
                {form.assignedCleaners.length > 1 && (
                  <div className="mt-2 p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 font-medium">
                    👥 Состав пары: {form.assignedCleaners.map((c) => c.name).join(' + ')}
                  </div>
                )}
              </div>

              {/* ТЗ / Заметки */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ТЗ для клинеров / Заметки</label>
                <textarea
                  rows={2}
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Код от калитки, на что обратить внимание..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Итоговая стоимость и Сохранение */}
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
                  onSave(form);
                  onClose();
                }}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition"
              >
                💾 Сохранить и обновить заказ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
