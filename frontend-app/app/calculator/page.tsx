"use client";
import React, { useState, useEffect } from 'react';
import {
  calculateBrightHouseOrder,
  CalculationInput,
  ServiceType,
} from '../../lib/calculator';

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
      dryArmchair: 0,
    };
  };

  const [input, setInput] = useState<CalculationInput>(getInitialState);
  const [addonRates, setAddonRates] = useState<Record<string, { price: number; durationMins: number }>>({});
  const [lang, setLang] = useState<'RU' | 'PL' | 'EN'>('PL');
  const [copied, setCopied] = useState(false);

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
      if (input.drySofa2 || input.drySofa3 || input.drySofaCorner4) addonsList.push(`Pranie tapicerki meblowej`);

      if (addonsList.length > 0) {
        text += `➕ Usługi dodatkowe:\n${addonsList.map((a) => `  - ${a}`).join('\n')}\n\n`;
      }

      text += `💰 Całkowity koszt: ${calcResult.totalPrice} zł\n\n`;
      text += `Przyjeżdżamy z własnym profesjonalnym sprzętem i chemią.\n`;
      text += `Czy proponowany termin Państwu odpowiada?`;
      return text;
    }

    if (lang === 'EN') {
      let text = `Hello! Thank you for contacting BrightHouse Cleaning 🏠✨\n\n`;
      text += `📋 Your cleaning estimate details:\n`;
      text += `• Service: ${sName}\n`;
      text += `• Area: ${input.areaM2} m²\n`;
      if (!isOffice) {
        text += `• Rooms: ${input.roomsCount}, Bathrooms: ${input.bathroomsCount}\n`;
      }
      text += `• Estimated time: approx. ${calcResult.formattedDuration}\n\n`;

      const addonsList: string[] = [];
      if (input.windowsCount) addonsList.push(`Standard windows: ${input.windowsCount}`);
      if (input.balconyWindowsCount) addonsList.push(`Balcony windows: ${input.balconyWindowsCount}`);
      if (input.showcaseWindowsCount) addonsList.push(`Showcases: ${input.showcaseWindowsCount}`);
      if (input.hasOven) addonsList.push(`Oven cleaning`);
      if (input.hasFridge) addonsList.push(`Fridge cleaning`);
      if (input.hasKitchenClosets) addonsList.push(`Inside kitchen cabinets`);
      if (input.drySofa2 || input.drySofa3 || input.drySofaCorner4) addonsList.push(`Upholstery dry cleaning`);

      if (addonsList.length > 0) {
        text += `➕ Add-ons included:\n${addonsList.map((a) => `  - ${a}`).join('\n')}\n\n`;
      }

      text += `💰 Total price: ${calcResult.totalPrice} zł\n\n`;
      text += `We provide all professional equipment and eco-safe supplies.\n`;
      text += `Would you like to book this appointment?`;
      return text;
    }

    // RU
    let text = `Здравствуйте! Спасибо за обращение в BrightHouse Cleaning 🏠✨\n\n`;
    text += `📋 Детали вашего расчета:\n`;
    text += `• Услуга: ${sName}\n`;
    text += `• Площадь: ${input.areaM2} м²\n`;
    if (!isOffice) {
      text += `• Комнат: ${input.roomsCount}, Санузлов: ${input.bathroomsCount}\n`;
    }
    text += `• Оценочное время уборки: около ${calcResult.formattedDuration}\n\n`;

    const addonsList: string[] = [];
    if (input.windowsCount) addonsList.push(`Мойка окон (стандарт): ${input.windowsCount} шт.`);
    if (input.balconyWindowsCount) addonsList.push(`Мойка окон (балконных): ${input.balconyWindowsCount} шт.`);
    if (input.showcaseWindowsCount) addonsList.push(`Мойка витрин: ${input.showcaseWindowsCount} шт.`);
    if (input.hasOven) addonsList.push(`Духовка`);
    if (input.hasFridge) addonsList.push(`Холодильник`);
    if (input.hasKitchenClosets) addonsList.push(`Кухонные шкафы внутри`);
    if (input.hasSteamer) addonsList.push(`Обработка пароочистителем`);
    if (input.drySofa2 || input.drySofa3 || input.drySofaCorner4) addonsList.push(`Химчистка дивана / мебели`);

    if (addonsList.length > 0) {
      text += `➕ Дополнительные услуги:\n${addonsList.map((a) => `  - ${a}`).join('\n')}\n\n`;
    }

    text += `💰 Итоговая стоимость: ${calcResult.totalPrice} zł\n\n`;
    text += `Всё профессиональное оборудование и химию привозим с собой.\n`;
    text += `Подходит ли вам такая стоимость и дата?`;
    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateProposalText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">🧮 Калькулятор заказов и Генератор КП</h1>
          <p className="text-xs text-slate-500">
            Единый точный расчет для менеджеров с автосохранением черновика и экспортом сообщения для клиента
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Язык КП:</span>
          {(['PL', 'RU', 'EN'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`px-3 py-1 text-xs font-bold rounded-xl border transition ${
                lang === l
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {l === 'PL' ? '🇵🇱 Polski' : l === 'RU' ? '🇷🇺 Русский' : '🇬🇧 English'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Левая колонка: Параметры */}
        <div className="lg:col-span-7 space-y-4">
          {/* Тип услуги */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              1. Категория помещения и тариф
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'STANDARD', label: 'Стандарт' },
                { type: 'STANDARD_PLUS', label: 'Стандарт +' },
                { type: 'GENERAL', label: 'Генеральная' },
                { type: 'AFTER_REPAIR', label: 'После ремонта' },
                { type: 'OFFICE_REGULAR', label: 'Офис: Обычная (4 zł/м²)' },
                { type: 'OFFICE_GENERAL', label: 'Офис: Генеральная (12 zł/м²)' },
              ].map(({ type, label }) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setInput({ ...input, serviceType: type as ServiceType })}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition text-left ${
                    input.serviceType === type
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
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
          </div>

          {/* Окна и витрины */}
          <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 space-y-2">
            <span className="text-xs font-bold text-sky-950 uppercase block">🪟 Мойка окон и витрин</span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-sky-900 block mb-1">Обычные (35 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.windowsCount || 0}
                  onChange={(e) => setInput({ ...input, windowsCount: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-sky-200 rounded-lg p-1.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-sky-900 block mb-1">Балконные (45 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.balconyWindowsCount || 0}
                  onChange={(e) => setInput({ ...input, balconyWindowsCount: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-sky-200 rounded-lg p-1.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-sky-900 block mb-1">Витрины (50 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.showcaseWindowsCount || 0}
                  onChange={(e) => setInput({ ...input, showcaseWindowsCount: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-sky-200 rounded-lg p-1.5 text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Допы */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              3. Дополнительные опции
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: 'hasOven', label: '🍳 Духовка (45 zł)' },
                { k: 'hasFridge', label: '❄️ Холодильник (35 zł)' },
                { k: 'hasFridgeFreeze', label: '🧊 Морозилка (50 zł)' },
                { k: 'hasMicrowave', label: '📡 СВЧ (20 zł)' },
                { k: 'hasBalcony', label: '🌿 Балкон (35 zł)' },
                { k: 'hasKitchenClosets', label: '🗄️ Кух. шкафы (100 zł)' },
                { k: 'hasStairs', label: '🪜 Лестница (30 zł)' },
                { k: 'hasSteamer', label: '💨 Пароочиститель (75 zł)' },
                { k: 'hasVacuum', label: '🔌 Пылесос (30 zł)' },
              ].map(({ k, label }) => {
                const active = input[k as keyof CalculationInput];
                return (
                  <button
                    type="button"
                    key={k}
                    onClick={() => setInput({ ...input, [k]: !active })}
                    className={`p-2 rounded-xl text-xs font-medium border text-left flex justify-between items-center transition ${
                      active
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
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
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2">
            <span className="text-xs font-bold text-amber-950 uppercase block">🛋️ Химчистка мебели</span>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-slate-600 block mb-0.5">Диван 2-м (180 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.drySofa2 || 0}
                  onChange={(e) => setInput({ ...input, drySofa2: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-amber-200 rounded-lg p-1.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block mb-0.5">Диван 3-м (200 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.drySofa3 || 0}
                  onChange={(e) => setInput({ ...input, drySofa3: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-amber-200 rounded-lg p-1.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block mb-0.5">Угловой (220 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.drySofaCorner4 || 0}
                  onChange={(e) => setInput({ ...input, drySofaCorner4: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-amber-200 rounded-lg p-1.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block mb-0.5">Кресло (60 zł)</label>
                <input
                  type="number"
                  min="0"
                  value={input.dryArmchair || 0}
                  onChange={(e) => setInput({ ...input, dryArmchair: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-amber-200 rounded-lg p-1.5 text-xs font-bold"
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
              <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                <span>Расчетное время:</span>
                <span className="font-mono font-bold text-white">{calcResult.formattedDuration}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                💬 Текст сообщения клиенту ({lang})
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-2xs"
              >
                {copied ? '✅ Скопировано!' : '📋 Копировать текст'}
              </button>
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
    </div>
  );
}
