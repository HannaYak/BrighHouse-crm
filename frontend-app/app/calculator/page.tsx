"use client";
import React, { useState, useEffect } from 'react';
import {
  calculateBrightHouseOrder,
  CalculationInput,
  ServiceType,
} from '../../lib/calculator';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

const CALC_DRAFT_KEY = 'brighthouse_calculator_page_draft';

const SERVICE_NAMES: Record<ServiceType, { ru: string; pl: string; en: string }> = {
  STANDARD: { ru: 'Стандартная уборка', pl: 'Sprzątanie standardowe', en: 'Standard cleaning' },
  STANDARD_PLUS: { ru: 'Стандарт +', pl: 'Standard +', en: 'Standard +' },
  GENERAL: { ru: 'Генеральная уборка', pl: 'Sprzątanie gruntowne (generalne)', en: 'Deep cleaning' },
  AFTER_REPAIR: { ru: 'После ремонта', pl: 'Sprzątanie po remoncie', en: 'Post-construction cleaning' },
  OFFICE_REGULAR: { ru: 'Офис: Обычная уборка', pl: 'Biuro: Sprzątanie regularne', en: 'Office: Regular cleaning' },
  OFFICE_GENERAL: { ru: 'Офис: Генеральная уборка', pl: 'Biuro: Sprzątanie gruntowne', en: 'Office: Deep cleaning' },
};

export default function CalculatorPage() {
  const getInitialState = (): CalculationInput => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CALC_DRAFT_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return {
      serviceType: 'STANDARD',
      roomsCount: 2,
      bathroomsCount: 1,
      areaM2: 45,
      cleanersCount: 1,
      startTime: '10:00',
      windowsCount: 0,
      balconyWindowsCount: 0,
      showcaseWindowsCount: 0,
      hasOven: false,
      hasFridge: false,
      hasFridgeFreeze: false,
      hasMicrowave: false,
      hasBalcony: false,
      hasKitchenClosets: false,
      hasStairs: false,
      hasSteamer: false,
      hasVacuum: false,
      drySofa2: 0,
      drySofa3: 0,
      drySofaCorner4: 0,
      drySofaBig: 0,
      dryChair: 0,
      dryArmchair: 0,
      dryCarpetM2: 0,
      discountPercent: 0,
      discountFixed: 0,
    };
  };

  const [input, setInput] = useState<CalculationInput>(getInitialState);
  const [addonRates, setAddonRates] = useState<Record<string, { price: number; durationMins: number }>>({});
  const [lang, setLang] = useState<'RU' | 'PL' | 'EN'>('PL');
  const [copied, setCopied] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderToCreate, setOrderToCreate] = useState<OrderDetail | null>(null);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CALC_DRAFT_KEY, JSON.stringify(input));
    }
  }, [input]);

  const calcResult = calculateBrightHouseOrder({
    ...input,
    addonRates,
  });

  const isOffice = input.serviceType === 'OFFICE_REGULAR' || input.serviceType === 'OFFICE_GENERAL';
  const specialistPart = calcResult.specialistRevenue;
  const basePart = Math.max(0, calcResult.totalPrice - specialistPart);

  const handleCreateOrderFromCalc = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setOrderToCreate({
      date: todayStr,
      startTime: input.startTime || '10:00',
      endTime: calcResult.endTime || '13:00',
      timeSlot: `${input.startTime || '10:00'} — ${calcResult.endTime || '13:00'}`,
      serviceType: input.serviceType,
      areaM2: input.areaM2 || 45,
      roomsCount: input.roomsCount || 1,
      bathroomsCount: input.bathroomsCount || 1,
      windowsCount: input.windowsCount || 0,
      showcaseWindowsCount: input.showcaseWindowsCount || 0,
      balconyWindowsCount: input.balconyWindowsCount || 0,
      hasOven: Boolean(input.hasOven),
      hasFridge: Boolean(input.hasFridge),
      hasFridgeFreeze: Boolean(input.hasFridgeFreeze),
      hasMicrowave: Boolean(input.hasMicrowave),
      hasBalcony: Boolean(input.hasBalcony),
      hasKitchenClosets: Boolean(input.hasKitchenClosets),
      hasStairs: Boolean(input.hasStairs),
      hasSteamer: Boolean(input.hasSteamer),
      hasVacuum: Boolean(input.hasVacuum),
      hasDishesHours: 0,
      hasIroningHours: 0,
      hasPets: false,
      hasKeys: false,
      drySofa2: input.drySofa2 || 0,
      drySofa3: input.drySofa3 || 0,
      drySofaCorner4: input.drySofaCorner4 || 0,
      drySofaBig: input.drySofaBig || 0,
      dryChair: input.dryChair || 0,
      dryArmchair: input.dryArmchair || 0,
      dryCarpetM2: input.dryCarpetM2 || 0,
      discountPercent: input.discountPercent || 0,
      discountFixed: input.discountFixed || 0,
      price: calcResult.totalPrice,
      cleanersCount: input.cleanersCount || 1,
      assignedCleaners: [],
      clientName: '',
      clientPhone: '',
      addressLine1: '',
      status: 'NEW',
      notes: 'Заказ оформлен через калькулятор CRM',
      paymentMethod: 'CASH',
    });
    setIsOrderModalOpen(true);
  };

  const handleSaveOrder = async (saved: OrderDetail) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saved),
      });
      if (res.ok) {
        setIsOrderModalOpen(false);
        setOrderToCreate(null);
        alert('✅ Заказ успешно создан и отправлен на Канбан!');
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Проверьте данные');
      }
    } catch (e: any) {
      throw e;
    }
  };

  const generateProposalText = () => {
    const sName = SERVICE_NAMES[input.serviceType][lang.toLowerCase() as 'ru' | 'pl' | 'en'];

    if (lang === 'PL') {
      let text = `Dzień dobry! Dziękujemy za kontakt z BrightHouse Cleaning 🏠✨\n\n`;
      text += `📋 Szczegóły Twojej wyceny:\n`;
      text += `• Usługa: ${sName}\n`;
      text += `• Metraż: ${input.areaM2} m²\n`;
      if (!isOffice) {
        text += `• Pokoje: ${input.roomsCount}, Łazienki: ${input.bathroomsCount}\n`;
      }
      text += `• Szacowany czas: około ${calcResult.formattedDuration}\n\n`;

      const addonsList: string[] = [];
      if (input.windowsCount) addonsList.push(`Mycie okien standardowych: ${input.windowsCount} szt.`);
      if (input.balconyWindowsCount) addonsList.push(`Mycie okien balkonowych: ${input.balconyWindowsCount} szt.`);
      if (input.showcaseWindowsCount) addonsList.push(`Mycie witryn: ${input.showcaseWindowsCount} szt.`);
      if (input.hasOven) addonsList.push(`Czyszczenie piekarnika`);
      if (input.hasFridge) addonsList.push(`Mycie lodówki`);
      if (input.hasMicrowave) addonsList.push(`Mycie mikrofalówki`);
      if (input.hasKitchenClosets) addonsList.push(`Szafki kuchenne wewnątrz`);
      if (input.hasBalcony) addonsList.push(`Sprzątanie balkonu`);
      if (input.hasSteamer) addonsList.push(`Czyszczenie parowe`);
      if (input.drySofa2 || input.drySofa3 || input.drySofaCorner4 || input.drySofaBig || input.dryArmchair) {
        addonsList.push(`Pranie tapicerki meblowej`);
      }
      if (input.dryCarpetM2) addonsList.push(`Czyszczenie dywanu/wykładziny (${input.dryCarpetM2} m²)`);

      if (addonsList.length > 0) {
        text += `➕ Usługi dodatkowe:\n${addonsList.map((a) => `  - ${a}`).join('\n')}\n\n`;
      }

      if (input.discountPercent && input.discountPercent > 0) {
        text += `🎁 Rabat promocyjny: ${input.discountPercent}%\n`;
      } else if (input.discountFixed && input.discountFixed > 0) {
        text += `🎁 Rabat promocyjny: -${input.discountFixed} zł\n`;
      }

      text += `💰 Całkowity koszt: ${calcResult.totalPrice} zł\n\n`;
      text += `Przyjeżdżamy z własnym profesjonalnym sprzętem i chemią.\n`;
      text += `Czy proponowany termin Państwu odpowiada?`;
      return text;
    }

    if (lang === 'RU') {
      let text = `Здравствуйте! Благодарим за обращение в клининг BrightHouse 🏠✨\n\n`;
      text += `📋 Расчет стоимости уборки:\n`;
      text += `• Тариф: ${sName}\n`;
      text += `• Площадь: ${input.areaM2} м²\n`;
      if (!isOffice) {
        text += `• Комнат: ${input.roomsCount}, Санузлов: ${input.bathroomsCount}\n`;
      }
      text += `• Примерное время: ~${calcResult.formattedDuration}\n\n`;

      const addonsList: string[] = [];
      if (input.windowsCount) addonsList.push(`Мойка обычных окон: ${input.windowsCount} шт.`);
      if (input.balconyWindowsCount) addonsList.push(`Мойка балконных окон: ${input.balconyWindowsCount} шт.`);
      if (input.showcaseWindowsCount) addonsList.push(`Мойка витрин: ${input.showcaseWindowsCount} шт.`);
      if (input.hasOven) addonsList.push(`Духовка`);
      if (input.hasFridge) addonsList.push(`Холодильник`);
      if (input.hasMicrowave) addonsList.push(`Микроволновка`);
      if (input.hasKitchenClosets) addonsList.push(`Кухонные шкафы внутри`);
      if (input.hasBalcony) addonsList.push(`Балкон`);
      if (input.hasSteamer) addonsList.push(`Пароочиститель`);
      if (input.drySofa2 || input.drySofa3 || input.drySofaCorner4 || input.drySofaBig || input.dryArmchair) {
        addonsList.push(`Химчистка мягкой мебели`);
      }
      if (input.dryCarpetM2) addonsList.push(`Химчистка ковра (${input.dryCarpetM2} м²)`);

      if (addonsList.length > 0) {
        text += `➕ Дополнительные опции:\n${addonsList.map((a) => `  - ${a}`).join('\n')}\n\n`;
      }

      if (input.discountPercent && input.discountPercent > 0) {
        text += `🎁 Скидка: ${input.discountPercent}%\n`;
      } else if (input.discountFixed && input.discountFixed > 0) {
        text += `🎁 Скидка: -${input.discountFixed} zł\n`;
      }

      text += `💰 Итого к оплате: ${calcResult.totalPrice} zł\n\n`;
      text += `Клинеры привозят весь профессиональный инвентарь и химию.\n`;
      text += `Подскажите, какую дату и время рассматриваете для уборки?`;
      return text;
    }

    let text = `Hello! Thank you for reaching out to BrightHouse Cleaning 🏠✨\n\n`;
    text += `📋 Your quote details:\n`;
    text += `• Service: ${sName}\n`;
    text += `• Floor area: ${input.areaM2} m²\n`;
    if (!isOffice) {
      text += `• Rooms: ${input.roomsCount}, Bathrooms: ${input.bathroomsCount}\n`;
    }
    text += `• Estimated time: approx. ${calcResult.formattedDuration}\n\n`;
    text += `💰 Total price: ${calcResult.totalPrice} zł\n\n`;
    text += `We arrive fully equipped with professional cleaning gear and eco-friendly detergents.\n`;
    text += `Which date works best for you?`;
    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateProposalText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Шапка калькулятора */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">🧮 Калькулятор уборок и КП</h1>
          <p className="text-xs text-slate-500">
            Расчет стоимости, времени бригады и генерация текста предложения для клиента
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(['PL', 'RU', 'EN'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                lang === l ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {l === 'PL' ? '🇵🇱 Polski' : l === 'RU' ? '🇷🇺 Русский' : '🇬🇧 English'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Левая колонка: Параметры расчета */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
          {/* Категория и тариф */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Категория помещения и тариф
              </label>
              <div className="flex gap-1 bg-slate-200 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    if (isOffice) setInput({ ...input, serviceType: 'STANDARD' });
                  }}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    !isOffice ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  🏠 Жилые
                </button>
                <button
                  type="button"
                  onClick={() => setInput({ ...input, serviceType: 'OFFICE_REGULAR' })}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    isOffice ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  🏢 Офисы
                </button>
              </div>
            </div>

            {isOffice ? (
              <div className="grid grid-cols-2 gap-2 bg-indigo-50/50 p-2 rounded-xl border border-indigo-200">
                <button
                  type="button"
                  onClick={() => setInput({ ...input, serviceType: 'OFFICE_REGULAR' })}
                  className={`py-2 px-3 text-center text-xs font-bold rounded-lg border transition cursor-pointer ${
                    input.serviceType === 'OFFICE_REGULAR'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  🏢 Обычная (4 zł/м²)
                </button>
                <button
                  type="button"
                  onClick={() => setInput({ ...input, serviceType: 'OFFICE_GENERAL' })}
                  className={`py-2 px-3 text-center text-xs font-bold rounded-lg border transition cursor-pointer ${
                    input.serviceType === 'OFFICE_GENERAL'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  ✨ Генеральная (12 zł/м²)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { type: 'STANDARD', label: 'Стандарт' },
                  { type: 'STANDARD_PLUS', label: 'Стандарт+' },
                  { type: 'GENERAL', label: 'Генеральная' },
                  { type: 'AFTER_REPAIR', label: 'После ремонта' },
                ].map(({ type, label }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setInput({ ...input, serviceType: type as ServiceType })}
                    className={`py-2 px-1 text-center text-xs font-semibold rounded-lg border transition cursor-pointer ${
                      input.serviceType === type
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Метраж и комнаты */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Метраж (м²)</label>
              <input
                type="number"
                min="1"
                value={input.areaM2}
                onChange={(e) => setInput({ ...input, areaM2: Math.max(1, Number(e.target.value)) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
              />
            </div>
            {!isOffice && (
              <>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Комнат</label>
                  <input
                    type="number"
                    min="1"
                    value={input.roomsCount}
                    onChange={(e) => setInput({ ...input, roomsCount: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Санузлов</label>
                  <input
                    type="number"
                    min="1"
                    value={input.bathroomsCount}
                    onChange={(e) => setInput({ ...input, bathroomsCount: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
                  />
                </div>
              </>
            )}
          </div>

          {/* Мойка окон */}
          <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-3.5 space-y-2">
            <span className="text-xs font-bold text-sky-950 uppercase block">🪟 Мойка окон и витрин</span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-sky-800 font-semibold block mb-1">Обычные (35 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.windowsCount || 0}
                  onChange={(e) => setInput({ ...input, windowsCount: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-sky-200 rounded-lg p-1.5 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-sky-800 font-semibold block mb-1">Балконные (45 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.balconyWindowsCount || 0}
                  onChange={(e) => setInput({ ...input, balconyWindowsCount: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-sky-200 rounded-lg p-1.5 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-sky-800 font-semibold block mb-1">Витрины (50 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.showcaseWindowsCount || 0}
                  onChange={(e) => setInput({ ...input, showcaseWindowsCount: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-sky-200 rounded-lg p-1.5 text-xs font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Дополнительные опции */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Дополнительные услуги
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: 'hasOven', label: `🍳 Духовка (${addonRates['oven']?.price || 45} zł)` },
                { k: 'hasFridge', label: `❄️ Холодильник (${addonRates['fridge']?.price || 35} zł)` },
                { k: 'hasFridgeFreeze', label: `🧊 Холод.+мороз. (${addonRates['fridgeFreeze']?.price || 50} zł)` },
                { k: 'hasMicrowave', label: `📡 СВЧ (${addonRates['microwave']?.price || 20} zł)` },
                { k: 'hasKitchenClosets', label: `🗄️ Кух. шкафы (${addonRates['kitchenClosets']?.price || 100} zł)` },
                { k: 'hasBalcony', label: `🌿 Балкон (${addonRates['balcony']?.price || 35} zł)` },
                { k: 'hasSteamer', label: `💨 Пароочиститель (${addonRates['steamer']?.price || 75} zł)` },
                { k: 'hasStairs', label: `🪜 Лестница (${addonRates['stairs']?.price || 30} zł)` },
                { k: 'hasVacuum', label: `🔌 Пылесос (${addonRates['vacuum']?.price || 30} zł)` },
              ].map(({ k, label }) => {
                const active = Boolean(input[k as keyof CalculationInput]);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setInput({ ...input, [k]: !active })}
                    className={`p-2 text-left text-xs font-medium rounded-xl border transition flex items-center justify-between cursor-pointer ${
                      active
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{label}</span>
                    <span>{active ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Химчистка */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-3">
            <span className="text-xs font-bold text-amber-950 uppercase block">
              🛋️ Химчистка мебели и ковров
            </span>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-slate-600 block mb-1">Диван 2-м. (180 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.drySofa2 || 0}
                  onChange={(e) => setInput({ ...input, drySofa2: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-amber-200 rounded p-1 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block mb-1">Диван 3-м. (200 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.drySofa3 || 0}
                  onChange={(e) => setInput({ ...input, drySofa3: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-amber-200 rounded p-1 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block mb-1">Угловой (220 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.drySofaCorner4 || 0}
                  onChange={(e) => setInput({ ...input, drySofaCorner4: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-amber-200 rounded p-1 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block mb-1">П-образный (260 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.drySofaBig || 0}
                  onChange={(e) => setInput({ ...input, drySofaBig: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-amber-200 rounded p-1 text-xs font-bold"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-slate-600 block mb-1">Кресло (60 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.dryArmchair || 0}
                  onChange={(e) => setInput({ ...input, dryArmchair: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-amber-200 rounded p-1 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block mb-1">Стул (15 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.dryChair || 0}
                  onChange={(e) => setInput({ ...input, dryChair: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-amber-200 rounded p-1 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block mb-1">Ковер м² (15 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.dryCarpetM2 || 0}
                  onChange={(e) => setInput({ ...input, dryCarpetM2: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-amber-200 rounded p-1 text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Скидки */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 space-y-2">
            <span className="text-[10px] font-bold text-purple-950 uppercase block">🎁 Применить скидку</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-purple-900 block mb-1">Скидка (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={input.discountPercent || 0}
                  onChange={(e) => setInput({ ...input, discountPercent: Math.max(0, Number(e.target.value)), discountFixed: 0 })}
                  className="w-full bg-white border border-purple-200 rounded-lg p-1.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-purple-900 block mb-1">Фиксированная скидка (zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.discountFixed || 0}
                  onChange={(e) => setInput({ ...input, discountFixed: Math.max(0, Number(e.target.value)), discountPercent: 0 })}
                  className="w-full bg-white border border-purple-200 rounded-lg p-1.5 text-xs font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Правая колонка: Итог и Текст предложения для клиента */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Итоговая стоимость</span>
              <div className="text-2xl font-black font-mono text-emerald-400">
                {calcResult.totalPrice} <span className="text-sm font-normal text-slate-300">zł</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Базовая уборка:</span>
                <span className="font-mono">{basePart} zł</span>
              </div>
              {specialistPart > 0 && (
                <div className="flex justify-between text-amber-300 font-semibold">
                  <span>Окна и химчистка:</span>
                  <span className="font-mono">+{specialistPart} zł</span>
                </div>
              )}
              {((input.discountPercent ?? 0) > 0 || (input.discountFixed ?? 0) > 0) && (
                <div className="flex justify-between text-purple-300 font-semibold">
                  <span>Применена скидка:</span>
                  <span className="font-mono">
                    {(input.discountPercent ?? 0) > 0 ? `-${input.discountPercent}%` : `-${input.discountFixed} zł`}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                <span>Расчетное время:</span>
                <span className="font-mono font-bold text-white">{calcResult.formattedDuration}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateOrderFromCalc}
              className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>📝</span>
              <span>Оформить этот заказ</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                💬 Текст сообщения клиенту ({lang})
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(generateProposalText())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-2xs"
                  title="Отправить расчет в WhatsApp"
                >
                  💬 WhatsApp
                </a>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-2xs"
                >
                  {copied ? '✅ Скопировано!' : '📋 Копировать'}
                </button>
              </div>
            </div>

            <textarea
              readOnly
              rows={15}
              value={generateProposalText()}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 leading-relaxed outline-none select-all"
            />
          </div>
        </div>
      </div>

      {/* Модалка оформления рассчитанного заказа */}
      {isOrderModalOpen && (
        <OrderModal
          order={orderToCreate}
          isOpen={isOrderModalOpen}
          onClose={() => {
            setIsOrderModalOpen(false);
            setOrderToCreate(null);
          }}
          onSave={handleSaveOrder}
        />
      )}
    </div>
  );
}
