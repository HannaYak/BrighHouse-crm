"use client";
import React, { useState, useEffect } from 'react';
import {
  calculateBrightHouseOrder,
  ServiceType,
  DiscountTarget,
  SubscriptionType,
} from '../lib/calculator';

export interface OrderDetail {
  id?: string;
  clientId?: number | null;
  orderNumber?: string;
  date: string;
  startTime: string;
  endTime: string;
  timeSlot?: string;
  status?: string;
  serviceType: ServiceType;
  areaM2: number;
  roomsCount: number;
  bathroomsCount: number;
  windowsCount: number;
  showcaseWindowsCount?: number;
  balconyWindowsCount?: number;

  hasOven: boolean;
  hasHood?: boolean;
  hasFridge: boolean;
  hasFridgeFreeze: boolean;
  hasMicrowave: boolean;
  hasBalcony: boolean;
  hasGlassBalcony?: boolean;
  hasKitchenClosets: boolean;
  closetsCount?: number;
  hasDishwasherClean?: boolean;
  hasWashingMachineClean?: boolean;
  hasStairs: boolean;
  hasSteamer: boolean;
  steamerZonesCount?: number;
  hasBlinds?: boolean;
  hasVentilation?: boolean;
  hasMoldRemoval?: boolean;
  hasPetHair?: boolean;
  hasCatLitter?: boolean;
  furnitureMoveCount?: number;
  hasPipeClog?: boolean;
  hasLadderRental?: boolean;
  tileGroutAreaM2?: number;

  curtainsPairsCount?: number;
  laundryHours?: number;
  ironingHours?: number;
  dishesHours?: number;
  hasDishesHours: number;
  hasIroningHours: number;
  organizingHours?: number;
  gardenHours?: number;

  hasVacuum: boolean;
  hasPets: boolean;
  hasKeys: boolean;

  drySofa2: number;
  drySofa3: number;
  drySofaCorner4: number;
  drySofaCorner5?: number;
  drySofaBig?: number;
  drySofaU?: number;
  dryArmchair: number;
  dryChair?: number;
  dryPouf?: number;
  dryPillowsSmall?: number;
  dryPillowsBig?: number;
  dryHeadboard?: number;
  dryMattressSingle?: number;
  dryMattressDouble?: number;
  dryMattressSide?: number;
  dryCarpetM2?: number;

  clientName: string;
  clientPhone: string;
  clientHandle?: string;
  addressLine1: string;
  addressLine2?: string;
  price: number;
  cleanersCount: number;
  assignedCleaners: {
    id: number;
    cleanerId?: number;
    name: string;
    phone?: string;
    tags?: string[];
    district?: string;
    startTime?: string;
    endTime?: string;
  }[];
  notes?: string;

  discountPercent?: number;
  discountFixed?: number;
  discountTarget?: DiscountTarget;
  subscriptionType?: SubscriptionType;
  isComboGeneralDryClean?: boolean;

  paymentMethod?: string;
  paymentNote?: string;
  cashCollectedById?: number | null;
}

interface OrderModalProps {
  order: OrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedOrder: OrderDetail) => Promise<void> | void;
}

const serviceTitles: Record<ServiceType, string> = {
  STANDARD: 'Стандарт',
  STANDARD_PLUS: 'Стандарт +',
  GENERAL: 'Генеральная',
  AFTER_REPAIR: 'После ремонта',
  OFFICE_REGULAR: 'Офис: Обычная (4 zł/м²)',
  OFFICE_GENERAL: 'Офис: Генеральная (12 zł/м²)'
};

const DRAFT_KEY = 'brighthouse_order_draft';

const calcDuration = (startStr: string, endStr: string) => {
  if (!startStr || !endStr) return '';
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  const diffMins = Math.max(0, (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0)));
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
};

const getDefaultForm = (): OrderDetail => ({
  date: new Date().toISOString().split('T')[0],
  startTime: '10:00',
  endTime: '13:00',
  status: 'NEW',
  serviceType: 'STANDARD',
  areaM2: 45,
  roomsCount: 2,
  bathroomsCount: 1,
  windowsCount: 0,
  showcaseWindowsCount: 0,
  balconyWindowsCount: 0,
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
  clientHandle: '',
  addressLine1: '',
  addressLine2: '',
  price: 200,
  cleanersCount: 1,
  assignedCleaners: [],
  notes: '',
  discountPercent: 0,
  discountFixed: 0,
  discountTarget: 'ALL',
  subscriptionType: 'NONE',
  isComboGeneralDryClean: false,
  paymentMethod: 'CASH',
  paymentNote: '',
  cashCollectedById: null
});

export default function OrderModal({ order, isOpen, onClose, onSave }: OrderModalProps) {
  const [addonRates, setAddonRates] = useState<Record<string, { price: number; durationMins: number }>>({});
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [form, setForm] = useState<OrderDetail>(getDefaultForm());
  const [allCleaners, setAllCleaners] = useState<any[]>([]);
  const [durationText, setDurationText] = useState('3 ч');
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [availabilityMap, setAvailabilityMap] = useState<Record<number, any>>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const handleDispatchToCleaners = async () => {
    if (!form.id) {
      alert('Сначала сохраните заказ, чтобы отправить наряд в Telegram бот.');
      return;
    }
    if (!form.assignedCleaners || form.assignedCleaners.length === 0) {
      alert('⚠️ На этот заказ не назначены клинеры. Сначала выберите бригаду клинеров.');
      return;
    }

    try {
      setDispatching(true);
      const res = await fetch(`/api/orders/${form.id}/dispatch-cleaners`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const sentCount = data.results?.filter((r: any) => r.status === 'SENT').length || 0;
        const noTg = data.results?.filter((r: any) => r.status === 'NO_TELEGRAM_LINKED').map((r: any) => r.cleaner) || [];
        
        let msg = `✅ Наряд успешно отправлен в Telegram бот (${sentCount} сотр.)`;
        if (noTg.length > 0) {
          msg += `\n⚠️ У сотрудников нет привязанного Telegram: ${noTg.join(', ')}`;
        }
        alert(msg);
      } else {
        alert(`Ошибка отправки: ${data.error || 'Не удалось отправить наряд'}`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Ошибка: ${e.message || 'Ошибка соединения'}`);
    } finally {
      setDispatching(false);
    }
  };

  // Универсальный обработчик числовых полей: убирает ведущие нули (02 -> 2, 050 -> 50)
  const handleNumberInput = (field: keyof OrderDetail, rawValue: string) => {
    const sanitized = rawValue.replace(/^0+(?=\d)/, '');
    const num = sanitized === '' ? 0 : Number(sanitized);
    setForm((prev) => ({ ...prev, [field]: num }));
  };

  useEffect(() => {
    if (order) {
      let restoredCleaners = (order.assignedCleaners || []).map((c: any) => ({
        id: c.id || c.cleanerId,
        cleanerId: c.cleanerId || c.id,
        name: c.name || c.cleaner?.name || 'Клинер',
        district: c.district || c.cleaner?.district,
        phone: c.phone || c.cleaner?.phone,
        startTime: c.startTime || order.startTime || '10:00',
        endTime: c.endTime || order.endTime || '14:00',
      }));

      // Если в notes сохранены индивидуальные слоты клинеров
      if (order.notes) {
        const match = order.notes.match(/<!--CLEANER_SLOTS:(.*?)-->/);
        if (match && match[1]) {
          try {
            const slots = JSON.parse(match[1]);
            restoredCleaners = restoredCleaners.map((c: any) => {
              const cId = String(c.id || c.cleanerId);
              if (slots[cId]) {
                return {
                  ...c,
                  startTime: slots[cId].startTime || c.startTime,
                  endTime: slots[cId].endTime || c.endTime,
                };
              }
              return c;
            });
          } catch (e) {}
        }
      }

      setForm({
        ...order,
        assignedCleaners: restoredCleaners,
      });
      setHasRestoredDraft(false);
    } else if (isOpen && typeof window !== 'undefined') {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed && parsed.status === 'CONFIRMED') parsed.status = 'NEW';
          setForm(parsed);
          setHasRestoredDraft(true);
        } catch {
          setForm(getDefaultForm());
          setHasRestoredDraft(false);
        }
      } else {
        setForm(getDefaultForm());
        setHasRestoredDraft(false);
      }
    }
  }, [order, isOpen]);

  useEffect(() => {
    if (isOpen && !form.id && typeof window !== 'undefined') {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }
  }, [form, isOpen]);

  const clearDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DRAFT_KEY);
    }
    setForm(getDefaultForm());
    setHasRestoredDraft(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/settings/addons')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          const rates: Record<string, { price: number; durationMins: number }> = {};
          data.forEach((item: any) => {
            rates[item.code] = { price: item.price, durationMins: item.durationMins };
          });
          setAddonRates(rates);
        }
      })
      .catch(console.error);

    fetch('/api/cleaners')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAllCleaners(data))
      .catch(console.error);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !form.date || !form.startTime || !form.endTime) return;
    
    const checkAvailability = async () => {
      try {
        setLoadingAvailability(true);
        const parsedDate = new Date(form.date);
        const dateStr = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

        const res = await fetch(`/api/cleaners/available?date=${dateStr}&startTime=${form.startTime}&endTime=${form.endTime}${form.id ? `&excludeOrderId=${form.id}` : ''}`);
        if (res.ok) {
          const data = await res.json();
          const map: Record<number, any> = {};
          data.forEach((item: any) => {
            map[item.id] = item;
          });
          setAvailabilityMap(map);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAvailability(false);
      }
    };
    checkAvailability();
  }, [form.date, form.startTime, form.endTime, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const res = calculateBrightHouseOrder({
      serviceType: form.serviceType,
      roomsCount: form.roomsCount,
      bathroomsCount: form.bathroomsCount,
      areaM2: form.areaM2,
      windowsCount: form.windowsCount,
      showcaseWindowsCount: form.showcaseWindowsCount || 0,
      balconyWindowsCount: form.balconyWindowsCount || 0,
      hasOven: form.hasOven,
      hasHood: form.hasHood,
      hasFridge: form.hasFridge,
      hasFridgeFreeze: form.hasFridgeFreeze,
      hasMicrowave: form.hasMicrowave,
      hasBalcony: form.hasBalcony,
      hasGlassBalcony: form.hasGlassBalcony,
      hasKitchenClosets: form.hasKitchenClosets,
      closetsCount: form.closetsCount,
      hasDishwasherClean: form.hasDishwasherClean,
      hasWashingMachineClean: form.hasWashingMachineClean,
      hasStairs: form.hasStairs,
      hasSteamer: form.hasSteamer,
      steamerZonesCount: form.steamerZonesCount,
      hasBlinds: form.hasBlinds,
      hasVentilation: form.hasVentilation,
      hasMoldRemoval: form.hasMoldRemoval,
      hasPetHair: form.hasPetHair,
      hasCatLitter: form.hasCatLitter,
      furnitureMoveCount: form.furnitureMoveCount,
      hasPipeClog: form.hasPipeClog,
      hasLadderRental: form.hasLadderRental,
      tileGroutAreaM2: form.tileGroutAreaM2,
      curtainsPairsCount: form.curtainsPairsCount,
      laundryHours: form.laundryHours,
      ironingHours: form.ironingHours,
      hasIroningHours: form.hasIroningHours,
      dishesHours: form.dishesHours,
      hasDishesHours: form.hasDishesHours,
      organizingHours: form.organizingHours,
      gardenHours: form.gardenHours,
      hasVacuum: form.hasVacuum,
      hasPets: form.hasPets,
      hasKeys: form.hasKeys,
      drySofa2: form.drySofa2,
      drySofa3: form.drySofa3,
      drySofaCorner4: form.drySofaCorner4,
      drySofaCorner5: form.drySofaCorner5,
      drySofaBig: form.drySofaBig,
      drySofaU: form.drySofaU,
      dryArmchair: form.dryArmchair,
      dryChair: form.dryChair,
      dryPouf: form.dryPouf,
      dryPillowsSmall: form.dryPillowsSmall,
      dryPillowsBig: form.dryPillowsBig,
      dryHeadboard: form.dryHeadboard,
      dryMattressSingle: form.dryMattressSingle,
      dryMattressDouble: form.dryMattressDouble,
      dryMattressSide: form.dryMattressSide,
      dryCarpetM2: form.dryCarpetM2,
      cleanersCount: Math.max(1, form.assignedCleaners.length),
      startTime: form.startTime || '10:00',
      addonRates,
      discountPercent: form.discountPercent || 0,
      discountFixed: form.discountFixed || 0,
      discountTarget: form.discountTarget || 'ALL',
      subscriptionType: form.subscriptionType || 'NONE',
      isComboGeneralDryClean: form.isComboGeneralDryClean || false,
    });

    setForm((prev) => {
      const prevEndTime = prev.endTime;
      const updatedCleaners = prev.assignedCleaners.map((c) => {
        // Если у клинера стояло стандартное время окончания, обновляем его на новое рассчитанное
        if (!c.endTime || c.endTime === prevEndTime) {
          return { ...c, endTime: res.endTime, startTime: c.startTime || form.startTime };
        }
        return c;
      });
      return {
        ...prev,
        price: res.totalPrice,
        endTime: res.endTime,
        cleanersCount: Math.max(1, prev.assignedCleaners.length),
        assignedCleaners: updatedCleaners,
      };
    });
    setDurationText(res.formattedDuration);
  }, [
    form.serviceType,
    form.roomsCount,
    form.bathroomsCount,
    form.areaM2,
    form.windowsCount,
    form.showcaseWindowsCount,
    form.balconyWindowsCount,
    form.hasOven,
    form.hasHood,
    form.hasFridge,
    form.hasFridgeFreeze,
    form.hasMicrowave,
    form.hasBalcony,
    form.hasGlassBalcony,
    form.hasKitchenClosets,
    form.closetsCount,
    form.hasDishwasherClean,
    form.hasWashingMachineClean,
    form.hasStairs,
    form.hasSteamer,
    form.steamerZonesCount,
    form.hasBlinds,
    form.hasVentilation,
    form.hasMoldRemoval,
    form.hasPetHair,
    form.hasCatLitter,
    form.furnitureMoveCount,
    form.hasPipeClog,
    form.hasLadderRental,
    tileGroutAreaM2 => form.tileGroutAreaM2,
    form.curtainsPairsCount,
    form.laundryHours,
    form.ironingHours,
    form.hasIroningHours,
    form.dishesHours,
    form.hasDishesHours,
    form.organizingHours,
    form.gardenHours,
    form.hasVacuum,
    form.hasPets,
    form.hasKeys,
    form.drySofa2,
    form.drySofa3,
    form.drySofaCorner4,
    form.drySofaCorner5,
    form.drySofaBig,
    form.drySofaU,
    form.dryArmchair,
    form.dryChair,
    form.dryPouf,
    form.dryPillowsSmall,
    form.dryPillowsBig,
    form.dryHeadboard,
    form.dryMattressSingle,
    form.dryMattressDouble,
    form.dryMattressSide,
    form.dryCarpetM2,
    form.discountPercent,
    form.discountFixed,
    form.discountTarget,
    form.subscriptionType,
    form.isComboGeneralDryClean,
    form.assignedCleaners.length,
    form.startTime,
    addonRates,
    isOpen
  ]);

  if (!isOpen) return null;

  const isOffice = form.serviceType === 'OFFICE_REGULAR' || form.serviceType === 'OFFICE_GENERAL';

  // Клинеры: никогда не блокируем выбор! Показываем предупреждения, но разрешаем назначение
  const toggleCleaner = (cleaner: any) => {
    const cleanerId = cleaner.id || cleaner.cleanerId;
    const exists = form.assignedCleaners.some((c) => (c.id || c.cleanerId) === cleanerId);
    if (exists) {
      setForm({
        ...form,
        assignedCleaners: form.assignedCleaners.filter((c) => (c.id || c.cleanerId) !== cleanerId),
      });
      setWarningMessage(null);
    } else {
      const info = availabilityMap[cleaner.id];
      if (info && !info.isWorking) {
        setWarningMessage(`⚠️ У клинера ${cleaner.name} сегодня выходной по графику, но вы можете назначить его.`);
      } else if (info && info.isBusy) {
        setWarningMessage(`⚠️ У клинера ${cleaner.name} есть пересечение: ${info.busyOrders?.join(', ')}`);
      } else if (info && !info.fitsShiftHours) {
        setWarningMessage(`⚠️ Длительность заказа может превышать смену ${cleaner.name}. Добавьте второго клинера, чтобы разделить время.`);
      } else {
        setWarningMessage(null);
      }

      const newAssigned = {
        id: cleaner.id,
        cleanerId: cleaner.id,
        name: cleaner.name,
        district: cleaner.district,
        phone: cleaner.phone,
        startTime: form.startTime || '10:00',
        endTime: form.endTime || '14:00',
      };

      setForm({
        ...form,
        assignedCleaners: [...form.assignedCleaners, newAssigned],
      });
    }
  };

  const updateCleanerTime = (cleanerId: number, field: 'startTime' | 'endTime', value: string) => {
    setForm((prev) => {
      const updated = prev.assignedCleaners.map((c) => {
        if ((c.id || c.cleanerId) === cleanerId) {
          return { ...c, [field]: value };
        }
        return c;
      });
      return { ...prev, assignedCleaners: updated };
    });
  };

  const handleSave = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DRAFT_KEY);
    }

    const cleanerPayload = form.assignedCleaners.map((c: any) => ({
      id: typeof c === 'object' ? (c.id || c.cleanerId) : c,
      name: c.name,
      startTime: c.startTime || form.startTime,
      endTime: c.endTime || form.endTime,
    }));

    const normalizedStatus =
      form.status === 'COMPLETED' ? 'COMPLETED' :
      form.status === 'CANCELLED' ? 'CANCELLED' :
      form.status === 'PROCESSING' ? 'PROCESSING' :
      cleanerPayload.length > 0 ? 'ASSIGNED' : 'NEW';

    // Формируем индивидуальные графики бригады для сохранения в примечании
    const cleanerSlots: Record<string, { startTime: string; endTime: string }> = {};
    const cleanerScheduleStrings: string[] = [];

    form.assignedCleaners.forEach((c: any) => {
      const cId = String(c.id || c.cleanerId);
      const sT = c.startTime || form.startTime || '10:00';
      const eT = c.endTime || form.endTime || '14:00';
      cleanerSlots[cId] = { startTime: sT, endTime: eT };
      cleanerScheduleStrings.push(`${c.name}: ${sT}—${eT}`);
    });

    let extraNotes = (form.notes || '').replace(/<!--CLEANER_SLOTS:.*?-->/g, '').trim();
    if (cleanerScheduleStrings.length > 0) {
      const scheduleSummary = `[График бригады: ${cleanerScheduleStrings.join(', ')}]`;
      extraNotes = extraNotes.replace(/\[График бригады:.*?\]/g, '').trim();
      extraNotes = extraNotes ? `${extraNotes}\n${scheduleSummary}` : scheduleSummary;
    }
    if (Object.keys(cleanerSlots).length > 0) {
      const metaTag = `<!--CLEANER_SLOTS:${JSON.stringify(cleanerSlots)}-->`;
      extraNotes = `${extraNotes}\n${metaTag}`.trim();
    }

    const orderToSave: OrderDetail = {
      ...form,
      notes: extraNotes,
      status: normalizedStatus,
      assignedCleaners: cleanerPayload as any,
      timeSlot: `${form.startTime} — ${form.endTime}`,
    };

    try {
      setSaving(true);
      await onSave(orderToSave);
      onClose();
    } catch (err: any) {
      alert('Ошибка при сохранении: ' + (err.message || 'Попробуйте снова'));
    } finally {
      setSaving(false);
    }
  };

  const cleanPhone = (form.clientPhone || '').replace(/\D/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white sm:rounded-2xl border-0 sm:border border-slate-200 shadow-2xl w-full max-w-6xl h-[100dvh] sm:h-[92vh] max-h-[920px] flex flex-col overflow-hidden">
        {/* Шапка */}
        <div className="px-4 py-3 md:px-6 md:py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="font-mono text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded">
              {form.orderNumber || 'НОВЫЙ ЗАКАЗ'}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${form.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
              {form.status === 'COMPLETED' ? '✓ ОПЛАЧЕН' : form.status === 'ASSIGNED' ? '✅ НАЗНАЧЕН' : form.status || 'НОВЫЙ'}
            </span>
            <h2 className="text-sm sm:text-base font-bold text-slate-800 truncate">
              {form.clientName ? `Заказ: ${form.clientName}` : 'Новая заявка BrightHouse'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {hasRestoredDraft && (
              <button
                type="button"
                onClick={clearDraft}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg transition"
                title="Очистить черновик и сбросить форму"
              >
                Очистить черновик
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Контент */}
        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden overscroll-contain">
          {/* Левая колонка */}
          <div className="w-full md:w-[55%] p-4 md:p-6 border-b md:border-b-0 md:border-r border-slate-100 overflow-visible md:overflow-y-auto space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Категория помещения и тариф
                </label>
                <div className="flex gap-1 bg-slate-200 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      if (isOffice) setForm({ ...form, serviceType: 'STANDARD' });
                    }}
                    className={`px-2.5 py-1 rounded-md transition ${
                      !isOffice ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    🏠 Жилые
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, serviceType: 'OFFICE_REGULAR' })}
                    className={`px-2.5 py-1 rounded-md transition ${
                      isOffice ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    🏢 Офисы / Коммерция
                  </button>
                </div>
              </div>

              {isOffice ? (
                <div className="grid grid-cols-2 gap-2 bg-indigo-50/50 p-2 rounded-xl border border-indigo-200">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, serviceType: 'OFFICE_REGULAR' })}
                    className={`py-2 px-3 text-center text-xs font-bold rounded-lg border transition ${
                      form.serviceType === 'OFFICE_REGULAR'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    🏢 Обычная (4 zł/м²)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, serviceType: 'OFFICE_GENERAL' })}
                    className={`py-2 px-3 text-center text-xs font-bold rounded-lg border transition ${
                      form.serviceType === 'OFFICE_GENERAL'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ✨ Генеральная (12 zł/м²)
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {(['STANDARD', 'STANDARD_PLUS', 'GENERAL', 'AFTER_REPAIR'] as ServiceType[]).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setForm({ ...form, serviceType: t })}
                      className={`py-2 px-1 text-center text-xs font-semibold rounded-lg border transition ${
                        form.serviceType === t
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {serviceTitles[t]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Метраж и комнаты: авто-очистка 0 при вводе */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              {isOffice ? (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Площадь офиса (м²)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.areaM2 === 0 ? '' : form.areaM2}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('areaM2', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Окна (35 zł)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.windowsCount === 0 ? '' : form.windowsCount}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('windowsCount', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Витрины (50 zł)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.showcaseWindowsCount === 0 ? '' : form.showcaseWindowsCount}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('showcaseWindowsCount', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Метраж (м²)</label>
                    <input
                      type="number"
                      value={form.areaM2 === 0 ? '' : form.areaM2}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('areaM2', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Комнат</label>
                    <input
                      type="number"
                      value={form.roomsCount === 0 ? '' : form.roomsCount}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('roomsCount', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Санузлов</label>
                    <input
                      type="number"
                      value={form.bathroomsCount === 0 ? '' : form.bathroomsCount}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('bathroomsCount', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Окон (35 zł)</label>
                    <input
                      type="number"
                      value={form.windowsCount === 0 ? '' : form.windowsCount}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('windowsCount', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Окна и витрины */}
            <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-3 space-y-2">
              <span className="text-[11px] font-bold text-sky-900 uppercase block">🪟 Мойка окон и витрин</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-sky-800 font-semibold block">Обычные (35 zł)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.windowsCount === 0 ? '' : form.windowsCount}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleNumberInput('windowsCount', e.target.value)}
                    className="w-full bg-white border border-sky-200 rounded p-1 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-sky-800 font-semibold block">Балконные (45 zł)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.balconyWindowsCount === 0 ? '' : form.balconyWindowsCount}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleNumberInput('balconyWindowsCount', e.target.value)}
                    className="w-full bg-white border border-sky-200 rounded p-1 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-sky-800 font-semibold block">Витрины (50 zł)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.showcaseWindowsCount === 0 ? '' : form.showcaseWindowsCount}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleNumberInput('showcaseWindowsCount', e.target.value)}
                    className="w-full bg-white border border-sky-200 rounded p-1 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Дополнительные опции */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Дополнительные опции
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'hasOven', label: 'Духовка (45 zł)' },
                  { key: 'hasFridge', label: 'Холодильник (35 zł)' },
                  { key: 'hasFridgeFreeze', label: 'Морозилка (50 zł)' },
                  { key: 'hasMicrowave', label: 'Микроволновка (20 zł)' },
                  { key: 'hasKitchenClosets', label: 'Шкафы внутри (100 zł)' },
                  { key: 'hasBalcony', label: 'Балкон (35 zł)' },
                  { key: 'hasStairs', label: 'Лестница (30 zł)' },
                  { key: 'hasSteamer', label: 'Пароочиститель (75 zł)' },
                  { key: 'hasVacuum', label: 'Доставка пылесоса (30 zł)' },
                  { key: 'hasPets', label: '🐾 Есть питомцы (+10%)' },
                  { key: 'hasKeys', label: '🔑 Забрать/отдать ключи (30 zł)' },
                ].map((addon) => (
                  <label
                    key={addon.key}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                      (form as any)[addon.key]
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean((form as any)[addon.key])}
                      onChange={(e) => setForm({ ...form, [addon.key]: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>{addon.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Почасовые допы */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase block">⏱️ Почасовые услуги</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-xs font-semibold text-slate-700">Посуда (40 zł/ч)</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={form.hasDishesHours === 0 ? '' : form.hasDishesHours}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('hasDishesHours', e.target.value)}
                      className="w-14 bg-slate-50 border border-slate-200 rounded p-1 text-center text-xs font-bold"
                    />
                    <span className="text-xs text-slate-500 font-bold">ч</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-xs font-semibold text-slate-700">Глажка (50 zł/ч)</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={form.hasIroningHours === 0 ? '' : form.hasIroningHours}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('hasIroningHours', e.target.value)}
                      className="w-14 bg-slate-50 border border-slate-200 rounded p-1 text-center text-xs font-bold"
                    />
                    <span className="text-xs text-slate-500 font-bold">ч</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Химчистка */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-3">
              <span className="text-[11px] font-bold text-amber-900 uppercase block">🛋️ Химчистка мебели и ковров</span>

              <div>
                <span className="text-[10px] font-bold text-amber-800 uppercase block mb-1">Диваны</span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-600 block">2-мест. (180 zł)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.drySofa2 === 0 ? '' : form.drySofa2}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('drySofa2', e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded p-1 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 block">3-мест. (200 zł)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.drySofa3 === 0 ? '' : form.drySofa3}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('drySofa3', e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded p-1 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 block">Угловой (220 zł)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.drySofaCorner4 === 0 ? '' : form.drySofaCorner4}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('drySofaCorner4', e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded p-1 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 block">П-образный (260 zł)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.drySofaU === 0 ? '' : form.drySofaU}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('drySofaU', e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded p-1 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-amber-800 uppercase block mb-1">Стулья, матрасы и ковры</span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-600 block">Кресло (60 zł)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.dryArmchair === 0 ? '' : form.dryArmchair}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('dryArmchair', e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded p-1 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 block">Стул (15 zł)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.dryChair === 0 ? '' : form.dryChair}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('dryChair', e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded p-1 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 block">Матрас 2-сп. (140 zł)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.dryMattressDouble === 0 ? '' : form.dryMattressDouble}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('dryMattressDouble', e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded p-1 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 block">Ковер м² (15 zł)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.dryCarpetM2 === 0 ? '' : form.dryCarpetM2}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('dryCarpetM2', e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded p-1 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Контакты клиента с прямым переходом в Telegram, Instagram, WhatsApp и Чат */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Телефон клиента
                  </label>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="+48 123 456 789"
                      value={form.clientPhone}
                      onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                    />

                    {/* Панель доступных мессенджеров: Telegram, Instagram, WhatsApp, CRM */}
                    {cleanPhone && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <a
                          href={`https://t.me/+${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition shadow-2xs"
                          title="Открыть диалог в Telegram"
                        >
                          <span>✈️ TG</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            const ig = window.prompt('Введите никнейм клиента в Instagram:', form.clientHandle || '');
                            if (ig && ig.trim()) {
                              const cleanIg = ig.trim().replace('@', '');
                              setForm((prev) => ({ ...prev, clientHandle: `@${cleanIg}` }));
                              window.open(`https://instagram.com/${cleanIg}`, '_blank');
                            }
                          }}
                          className="px-2 py-1 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 hover:opacity-90 text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition shadow-2xs"
                          title="Открыть в Instagram"
                        >
                          <span>📸 IG</span>
                        </button>

                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition shadow-2xs"
                          title="Открыть в WhatsApp"
                        >
                          <span>💬 WA</span>
                        </a>

                        <a
                          href="/chat"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-[10px] font-bold flex items-center gap-1 transition"
                          title="Открыть в чате CRM"
                        >
                          <span>💬 Чат CRM</span>
                        </a>
                      </div>
                    )}
                  </div>
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

          {/* Правая колонка: Время, Бригада с индивидуальным таймингом и оплата */}
          <div className="w-full md:w-[45%] p-4 md:p-6 flex flex-col justify-between bg-slate-50/40 overflow-visible md:overflow-y-auto space-y-4">
            <div className="space-y-4">
              {/* Дата и общее время заказа */}
              <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
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
                    disabled
                    value={form.endTime}
                    className="w-full bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg p-1.5 text-xs font-extrabold text-center"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between px-3 py-2 bg-blue-50/80 border border-blue-200 rounded-lg text-xs font-semibold text-blue-900">
                <span>⏱️ Оценочное время на объекте:</span>
                <span className="font-bold bg-white px-2 py-0.5 rounded border border-blue-200">{durationText}</span>
              </div>

              {warningMessage && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-semibold leading-relaxed animate-pulse">
                  {warningMessage}
                </div>
              )}

              {/* Назначение клинеров: никого не блокируем + настройка смен для каждого */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">
                    Выбор клинеров ({form.assignedCleaners.length})
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {loadingAvailability ? 'Проверка...' : `Всего клинеров: ${allCleaners.length}`}
                  </span>
                </div>

                {/* Список клинеров: кликабельны всегда, если смена короче - просто подсказка */}
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {allCleaners.map((cleaner) => {
                    const isSelected = form.assignedCleaners.some((c) => (c.id || c.cleanerId) === cleaner.id);
                    const info = availabilityMap[cleaner.id];

                    return (
                      <button
                        type="button"
                        key={cleaner.id}
                        onClick={() => toggleCleaner(cleaner)}
                        className={`w-full px-3 py-2 rounded-lg text-xs flex items-center justify-between border transition cursor-pointer active:scale-99 ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-xs'
                            : info && !info.available
                            ? 'bg-amber-50/40 border-amber-200 text-slate-700 hover:bg-amber-50'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-left flex items-center gap-1.5">
                          <span>{isSelected ? '✅' : '➕'}</span>
                          <span className="font-bold">🙋‍♀️ {cleaner.name}</span>
                          <span className="text-[10px] text-slate-400">📍 {cleaner.district || 'Центр'}</span>
                        </div>

                        <div className="text-[10px] font-bold">
                          {info ? (
                            info.available ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {info.workHours}
                              </span>
                            ) : info.isBusy ? (
                              <span className="text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300">
                                ⚠️ Занят ({info.busyOrders?.[0]?.slice(0, 15) || 'наряд'})
                              </span>
                            ) : !info.isWorking ? (
                              <span className="text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                                💤 Выходной
                              </span>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                ⏱️ {info.workHours}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Настройка индивидуального времени для каждого клинера */}
                {form.assignedCleaners.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-blue-950 uppercase flex items-center gap-1">
                        <span>👥 Назначенная бригада ({form.assignedCleaners.length})</span>
                      </span>
                      <span className="text-[10px] text-blue-600 font-semibold">
                        Время для каждого сотрудника:
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {form.assignedCleaners.map((cleaner: any) => {
                        const cId = cleaner.id || cleaner.cleanerId;
                        const cStart = cleaner.startTime || form.startTime || '10:00';
                        const cEnd = cleaner.endTime || form.endTime || '14:00';
                        const durText = calcDuration(cStart, cEnd);

                        return (
                          <div
                            key={cId}
                            className="bg-white p-2.5 rounded-lg border border-blue-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-extrabold text-xs text-slate-800 truncate">
                                🙋‍♀️ {cleaner.name}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate">
                                • {cleaner.district || 'Центр'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">С:</span>
                                <input
                                  type="time"
                                  value={cStart}
                                  onChange={(e) => updateCleanerTime(cId, 'startTime', e.target.value)}
                                  className="bg-white border border-slate-300 rounded px-1 text-xs font-bold text-slate-800"
                                />
                                <span className="text-[10px] text-slate-500 font-bold uppercase ml-1">По:</span>
                                <input
                                  type="time"
                                  value={cEnd}
                                  onChange={(e) => updateCleanerTime(cId, 'endTime', e.target.value)}
                                  className="bg-white border border-slate-300 rounded px-1 text-xs font-bold text-slate-800"
                                />
                              </div>

                              <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100/70 px-2 py-1 rounded border border-blue-200">
                                ⏱️ {durText}
                              </span>

                              <button
                                type="button"
                                onClick={() => toggleCleaner(cleaner)}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-md text-xs font-bold transition cursor-pointer"
                                title="Удалить из заказа"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Акции, Абонементы и Таргетинг скидки */}
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 space-y-2.5">
                <span className="text-[11px] font-bold text-purple-950 uppercase block">
                  🎁 Акции, абонементы и скидки
                </span>

                <div>
                  <label className="text-[10px] text-purple-900 block font-semibold mb-1">Тип абонемента:</label>
                  <select
                    value={form.subscriptionType || 'NONE'}
                    onChange={(e) => setForm({ ...form, subscriptionType: e.target.value as SubscriptionType })}
                    className="w-full bg-white border border-purple-200 rounded-lg p-1.5 text-xs font-bold text-purple-950"
                  >
                    <option value="NONE">Без абонемента</option>
                    <option value="SUB_100_OFF">🎫 Скидка 100 zł на первый месяц абонемента (-100 zł)</option>
                    <option value="SUB_4_MONTH">📅 Регулярный: 4 раза в месяц (-15% на уборку)</option>
                    <option value="SUB_2_MONTH">📅 Регулярный: 2 раза в месяц (-10% на уборку)</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-white/80 p-1.5 rounded-lg border border-purple-200">
                  <input
                    type="checkbox"
                    checked={Boolean(form.isComboGeneralDryClean)}
                    onChange={(e) => setForm({ ...form, isComboGeneralDryClean: e.target.checked })}
                    className="w-3.5 h-3.5 rounded text-purple-600"
                  />
                  <span className="text-[11px] font-bold text-purple-900">
                    ✨ Комбо: Генералка + Химчистка (-10% на всю сумму)
                  </span>
                </label>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] text-purple-900 block font-semibold mb-0.5">Применить к:</label>
                    <select
                      value={form.discountTarget || 'ALL'}
                      onChange={(e) => setForm({ ...form, discountTarget: e.target.value as DiscountTarget })}
                      className="w-full bg-white border border-purple-200 rounded p-1 text-xs font-semibold"
                    >
                      <option value="ALL">На всё</option>
                      <option value="BASE_ONLY">Только база</option>
                      <option value="DRY_CLEAN_ONLY">Только химчистка</option>
                      <option value="ADDONS_ONLY">Только допы</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-purple-900 block font-semibold mb-0.5">Скидка (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.discountPercent === 0 ? '' : form.discountPercent}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('discountPercent', e.target.value)}
                      className="w-full bg-white border border-purple-200 rounded p-1 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-purple-900 block font-semibold mb-0.5">Скидка (zł)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.discountFixed === 0 ? '' : form.discountFixed}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleNumberInput('discountFixed', e.target.value)}
                      className="w-full bg-white border border-purple-200 rounded p-1 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Примечание */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Примечание к заказу
                </label>
                <textarea
                  rows={2}
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Код от подъезда, кровати не трогать..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                />
              </div>

              {/* Способ оплаты */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-xs">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                  💳 Способ оплаты заказа ({form.price} zł)
                </label>

                <select
                  value={form.paymentMethod || 'CASH'}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                >
                  <option value="CASH">💵 Наличные</option>
                  <option value="BIZ_CARD">🏢 Перевод на карту Бизнес</option>
                  <option value="SILA_CARD">💳 Карта Силы</option>
                  <option value="REVOLUT">⚡ Revolut</option>
                  <option value="PAYPAL">🅿️ PayPal</option>
                  <option value="MOMS_CARD">👩 Карта мамы</option>
                  <option value="DADS_CARD">👨 Карта бати</option>
                  <option value="STRIPE">🌐 Stripe</option>
                  <option value="OTHER">🔄 Другое...</option>
                </select>

                {form.paymentMethod === 'CASH' && (
                  <div className="pt-1">
                    <label className="text-[10px] font-bold text-amber-800 uppercase block mb-1">
                      Кто из клинеров забрал наличные?
                    </label>
                    <select
                      value={form.cashCollectedById || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          cashCollectedById: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full bg-amber-50/50 border border-amber-200 rounded-lg p-2 text-xs text-amber-900 font-semibold"
                    >
                      <option value="">Наличные в кассе офиса / у диспетчера</option>
                      {form.assignedCleaners?.map((c: any) => (
                        <option key={c.id || c.cleanerId} value={c.id || c.cleanerId}>
                          Клинер: {c.name} (забрал {form.price} zł)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {form.paymentMethod === 'OTHER' && (
                  <input
                    type="text"
                    placeholder="Укажите, куда именно поступили деньги..."
                    value={form.paymentNote || ''}
                    onChange={(e) => setForm({ ...form, paymentNote: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                  />
                )}
              </div>

              {/* Второстепенные действия для существующих заказов */}
              {form.id && (
                <div className="flex items-center gap-2 pt-2 flex-wrap border-t border-slate-200">
                  {form.status !== 'COMPLETED' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`Завершить заказ ${form.orderNumber} на сумму ${form.price} zł и отметить оплаченным?`)) return;

                        const payload = {
                          ...form,
                          status: 'COMPLETED',
                          timeSlot: `${form.startTime} — ${form.endTime}`,
                          assignedCleaners: form.assignedCleaners.map((c: any) => ({
                            id: typeof c === 'object' ? (c.id || c.cleanerId) : c,
                            name: c.name,
                          })),
                        };

                        await fetch('/api/orders', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload),
                        });

                        if (typeof window !== 'undefined') {
                          localStorage.removeItem(DRAFT_KEY);
                        }

                        onSave(payload as any);
                        onClose();
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2.5 rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1"
                      title="Отметить заказ выполненным и оплаченным"
                    >
                      ✅ Оплачен / Закрыть
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        const payload = {
                          ...form,
                          status: 'ASSIGNED',
                          timeSlot: `${form.startTime} — ${form.endTime}`,
                          assignedCleaners: form.assignedCleaners.map((c: any) => ({
                            id: typeof c === 'object' ? (c.id || c.cleanerId) : c,
                            name: c.name,
                          })),
                        };

                        await fetch('/api/orders', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload),
                        });

                        if (typeof window !== 'undefined') {
                          localStorage.removeItem(DRAFT_KEY);
                        }

                        onSave(payload as any);
                        onClose();
                      }}
                      className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1"
                      title="Вернуть заказ в статус В работе"
                    >
                      🔄 Вернуть в работу
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={dispatching}
                    onClick={handleDispatchToCleaners}
                    className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98"
                    title="Отправить наряд на уборку назначенным клинерам в Telegram бот"
                  >
                    <span>{dispatching ? '⏳' : '✈️'}</span>
                    <span>{dispatching ? 'Отправляем...' : 'Отправить в TG бот'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open(`/api/orders/${form.id}/invoice`, '_blank')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1"
                    title="Печать счета / Rachunek"
                  >
                    📄 Счет
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const reason = prompt('Укажите причину отмены заказа:');
                      if (reason !== null) {
                        await fetch('/api/orders', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: form.id, status: 'CANCELLED', cancelReason: reason }),
                        });
                        if (typeof window !== 'undefined') localStorage.removeItem(DRAFT_KEY);
                        onClose();
                        window.location.reload();
                      }
                    }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-3 py-2.5 rounded-xl text-xs transition"
                  >
                    ❌ Отменить
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Фиксированный нижний футер: сумма и кнопка сохранения всегда на экране */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between gap-3 safe-p-bottom shadow-lg z-30">
          <div className="flex items-center gap-2">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">К оплате:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={form.price === 0 ? '' : form.price}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleNumberInput('price', e.target.value)}
                  className="w-20 sm:w-24 bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-right font-extrabold text-slate-900 text-sm sm:text-base"
                />
                <span className="text-xs font-bold text-slate-600">zł</span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">• {durationText}</span>
          </div>

          <div className="flex items-center gap-2">
            {form.id && (
              <button
                type="button"
                disabled={dispatching}
                onClick={handleDispatchToCleaners}
                className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold py-3 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 shrink-0"
                title="Отправить наряд назначенным клинерам в Telegram бот"
              >
                <span>{dispatching ? '⏳' : '✈️'}</span>
                <span className="hidden sm:inline">{dispatching ? 'Отправка...' : 'Отправить в TG бот'}</span>
                <span className="sm:hidden">{dispatching ? '...' : 'В TG'}</span>
              </button>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex-1 sm:flex-initial sm:min-w-[200px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-5 rounded-xl text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {saving ? '⏳ Сохраняем...' : '💾 Сохранить заказ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
