"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ExtraService {
  id: string;
  name: string;
  price: number;
}

interface DryCleanItem {
  id: string;
  name: string;
  price: number;
}

const EXTRA_SERVICES: ExtraService[] = [
  { id: 'oven', name: '🧽 Духовка изнутри', price: 50 },
  { id: 'fridge', name: '🧊 Холодильник изнутри', price: 50 },
  { id: 'microwave', name: '📻 Микроволновка', price: 25 },
  { id: 'hood', name: '💨 Вытяжка', price: 40 },
  { id: 'dishes', name: '🍽 Посуда вручную', price: 40 },
  { id: 'balcony', name: '🌿 Уборка балкона / лоджии', price: 60 },
  { id: 'ironing', name: '👔 Глажка (за 1 час)', price: 50 },
  { id: 'pets', name: '🐾 Доплата за шерсть', price: 30 },
];

const DRY_CLEAN_ITEMS: DryCleanItem[] = [
  { id: 'sofa_2', name: '🛋 Прямой диван (2-местный)', price: 150 },
  { id: 'sofa_3', name: '🛋 Прямой диван (3-местный)', price: 180 },
  { id: 'sofa_corner', name: '🛋 Угловой диван (3-4 места)', price: 230 },
  { id: 'sofa_u', name: '🛋 П-образный большой диван', price: 290 },
  { id: 'armchair', name: '🪑 Кресло', price: 70 },
  { id: 'chair', name: '💺 Стул / пуф с мягкой спинкой', price: 30 },
  { id: 'mattress_single', name: '🛏 Матрас односпальный (с 2 сторон)', price: 120 },
  { id: 'mattress_double', name: '🛏 Матрас двуспальный (с 2 сторон)', price: 170 },
  { id: 'carpet', name: '🧶 Ковер / ковролин (за м²)', price: 25 },
];

export default function CalculatorPage() {
  const router = useRouter();

  // Режим: Уборка или Химчистка
  const [activeTab, setActiveTab] = useState<'CLEANING' | 'DRY_CLEANING'>('CLEANING');

  // 4 вида уборок
  const [cleaningType, setCleaningType] = useState<'STANDARD' | 'STANDARD_PLUS' | 'GENERAL' | 'POST_CONSTRUCTION'>('STANDARD');
  const [rooms, setRooms] = useState<number>(2);
  const [bathrooms, setBathrooms] = useState<number>(1);
  const [area, setArea] = useState<number>(50);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  
  // Мытье окон раздельно
  const [windowCount, setWindowCount] = useState<number>(0);
  const [balconyWindowCount, setBalconyWindowCount] = useState<number>(0);

  // Химчистка
  const [dryCleanCounts, setDryCleanCounts] = useState<{ [key: string]: number }>({});
  const [carpetArea, setCarpetArea] = useState<number>(10);

  // Данные клиента
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [copySuccess, setCopySuccess] = useState(false);
  const [creating, setCreating] = useState(false);

  // Расчет базовой стоимости уборки
  const calculateBaseCleaningPrice = () => {
    if (cleaningType === 'STANDARD') {
      return 160 + (rooms - 1) * 35 + (bathrooms - 1) * 45;
    }
    if (cleaningType === 'STANDARD_PLUS') {
      return 210 + (rooms - 1) * 45 + (bathrooms - 1) * 55;
    }
    if (cleaningType === 'GENERAL') {
      return 280 + (rooms - 1) * 65 + (bathrooms - 1) * 75;
    }
    if (cleaningType === 'POST_CONSTRUCTION') {
      return Math.max(380, area * 8);
    }
    return 0;
  };

  // Расчет допов + окон
  const calculateExtrasPrice = () => {
    const fixedExtras = selectedExtras.reduce((sum, extraId) => {
      const item = EXTRA_SERVICES.find(e => e.id === extraId);
      return sum + (item ? item.price : 0);
    }, 0);

    const windowsTotal = (windowCount * 35) + (balconyWindowCount * 45);
    return fixedExtras + windowsTotal;
  };

  // Расчет химчистки
  const calculateDryCleanPrice = () => {
    return Object.entries(dryCleanCounts).reduce((sum, [id, count]) => {
      if (id === 'carpet') {
        return sum + (count > 0 ? carpetArea * 25 : 0);
      }
      const item = DRY_CLEAN_ITEMS.find(e => e.id === id);
      return sum + (item ? item.price * count : 0);
    }, 0);
  };

  const cleaningBase = calculateBaseCleaningPrice();
  const cleaningExtras = calculateExtrasPrice();
  const dryCleanTotal = calculateDryCleanPrice();
  const grandTotal = cleaningBase + cleaningExtras + dryCleanTotal;

  const toggleExtra = (id: string) => {
    setSelectedExtras(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const updateDryCleanCount = (id: string, delta: number) => {
    setDryCleanCounts(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const getTypeNameRu = () => {
    if (cleaningType === 'STANDARD') return 'Стандартная уборка';
    if (cleaningType === 'STANDARD_PLUS') return 'Стандарт+ (Освежающая + фасады/техника)';
    if (cleaningType === 'GENERAL') return 'Генеральная уборка';
    return 'Уборка после ремонта';
  };

  // Генерация текста КП для клиента
  const generateOfferText = () => {
    const extrasLines: string[] = [];

    selectedExtras.forEach(id => {
      const item = EXTRA_SERVICES.find(e => e.id === id);
      if (item) extrasLines.push(`• ${item.name} — ${item.price} zł`);
    });

    if (windowCount > 0) {
      extrasLines.push(`• 🪟 Мытье стандартных окон (${windowCount} шт.) — ${windowCount * 35} zł`);
    }
    if (balconyWindowCount > 0) {
      extrasLines.push(`• 🚪 Мытье балконных окон/дверей (${balconyWindowCount} шт.) — ${balconyWindowCount * 45} zł`);
    }

    const dryCleanList = Object.entries(dryCleanCounts)
      .map(([id, count]) => {
        if (id === 'carpet') return `• Химчистка ковра (~${carpetArea} м²) — ${carpetArea * 25} zł`;
        const item = DRY_CLEAN_ITEMS.find(e => e.id === id);
        return item && count > 0 ? `• ${item.name} x${count} — ${item.price * count} zł` : '';
      })
      .filter(Boolean)
      .join('\n');

    let text = `Здравствуйте${clientName ? `, ${clientName}` : ''}! 🌸\n\nРасчет стоимости вашего заказа:\n`;

    if (cleaningBase > 0) {
      text += `✨ <b>${getTypeNameRu()}</b> (${rooms} комн., ${bathrooms} санузел${bathrooms > 1 ? 'а' : ''}${area ? `, ~${area} м²` : ''}) — <b>${cleaningBase} zł</b>\n`;
    }

    if (extrasLines.length > 0) {
      text += `\nДополнительные услуги:\n${extrasLines.join('\n')}\n`;
    }

    if (dryCleanList) {
      text += `\n🛋 Профессиональная экстракторная химчистка:\n${dryCleanList}\n`;
    }

    text += `\n💰 <b>Итоговая стоимость: ${grandTotal} zł</b>\n\nВ стоимость включен весь профессиональный инвентарь, немецкая химия и оборудование. Оплата производится после завершения работы и проверки качества.\n\nПодскажите, пожалуйста, какой день и время для вас будут наиболее удобны? ☺️`;

    return text;
  };

  const copyOffer = () => {
    const plainText = generateOfferText().replace(/<\/?b>/g, '');
    navigator.clipboard.writeText(plainText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleCreateOrder = async () => {
    setCreating(true);
    try {
      let mainService = getTypeNameRu();
      if (dryCleanTotal > 0 && cleaningBase === 0) {
        mainService = 'Химчистка мебели';
      } else if (dryCleanTotal > 0 && cleaningBase > 0) {
        mainService = `${getTypeNameRu()} + Химчистка`;
      }

      const windowsNote = [
        windowCount > 0 ? `Окон станд: ${windowCount}` : '',
        balconyWindowCount > 0 ? `Балк. окон: ${balconyWindowCount}` : ''
      ].filter(Boolean).join(', ');

      const orderPayload = {
        clientName: clientName || 'Клиент из калькулятора',
        clientPhone: clientPhone || '',
        addressLine1: address || 'Адрес уточняется',
        serviceType: mainService,
        price: grandTotal,
        date: new Date(date).toISOString(),
        status: 'NEW',
        notes: `Сформировано калькулятором. Допы: ${selectedExtras.join(', ')}. ${windowsNote}. Химчистка: ${Object.keys(dryCleanCounts).join(', ')}`,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (res.ok) {
        router.push('/kanban');
      } else {
        alert('Не удалось создать заказ');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка соединения');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-xl font-bold text-slate-900">🧮 Умный калькулятор (Уборка + Химчистка)</h1>
        <p className="text-xs text-slate-500">4 вида уборки, раздельное мытье окон, химчистка, расчет сметы и создание заказа</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Левая колонка: Настройка */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Переключатель вкладок */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('CLEANING')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === 'CLEANING' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🧹 Уборка квартир
            </button>
            <button
              onClick={() => setActiveTab('DRY_CLEANING')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === 'DRY_CLEANING' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🛋 Химчистка мебели
            </button>
          </div>

          {/* Вкладка 1: Уборка */}
          {activeTab === 'CLEANING' && (
            <div className="space-y-6">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Вид уборки (4 варианта)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'STANDARD', label: '✨ Стандарт' },
                    { id: 'STANDARD_PLUS', label: '⭐ Стандарт+' },
                    { id: 'GENERAL', label: '🧼 Генеральная' },
                    { id: 'POST_CONSTRUCTION', label: '🏗 После ремонта' },
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setCleaningType(type.id as any)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition border text-center ${
                        cleaningType === type.id
                          ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Параметры квартиры */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Комнаты</label>
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <button onClick={() => setRooms(Math.max(1, rooms - 1))} className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-200">-</button>
                    <span className="flex-1 text-center font-bold text-xs text-slate-900">{rooms}</span>
                    <button onClick={() => setRooms(rooms + 1)} className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-200">+</button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Санузлы</label>
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <button onClick={() => setBathrooms(Math.max(1, bathrooms - 1))} className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-200">-</button>
                    <span className="flex-1 text-center font-bold text-xs text-slate-900">{bathrooms}</span>
                    <button onClick={() => setBathrooms(bathrooms + 1)} className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-200">+</button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Площадь (м²)</label>
                  <input
                    type="number"
                    value={area}
                    onChange={(e) => setArea(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs font-bold text-center text-slate-800 bg-slate-50"
                  />
                </div>
              </div>

              {/* Блок мытья окон (Обычные 35 zł / Балконные 45 zł) */}
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">
                  🪟 Мытье окон
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-blue-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Обычное окно</div>
                      <div className="text-[10px] text-blue-600 font-extrabold">35 zł / шт</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setWindowCount(Math.max(0, windowCount - 1))} className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-xs">-</button>
                      <span className="w-6 text-center font-extrabold text-xs text-slate-900">{windowCount}</span>
                      <button onClick={() => setWindowCount(windowCount + 1)} className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-xs">+</button>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-blue-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Балконное окно / дверь</div>
                      <div className="text-[10px] text-blue-600 font-extrabold">45 zł / шт</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setBalconyWindowCount(Math.max(0, balconyWindowCount - 1))} className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-xs">-</button>
                      <span className="w-6 text-center font-extrabold text-xs text-slate-900">{balconyWindowCount}</span>
                      <button onClick={() => setBalconyWindowCount(balconyWindowCount + 1)} className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-xs">+</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Дополнительные опции уборки */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Дополнительные опции
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXTRA_SERVICES.map(extra => {
                    const isSelected = selectedExtras.includes(extra.id);
                    return (
                      <div
                        key={extra.id}
                        onClick={() => toggleExtra(extra.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-xs">{extra.name}</span>
                        <span className="text-xs font-extrabold text-emerald-600">+{extra.price} zł</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Вкладка 2: Химчистка */}
          {activeTab === 'DRY_CLEANING' && (
            <div className="space-y-4">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Выберите позиции для экстракторной химчистки
              </label>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                {DRY_CLEAN_ITEMS.map(item => {
                  const count = dryCleanCounts[item.id] || 0;
                  return (
                    <div key={item.id} className="p-3 flex justify-between items-center bg-white hover:bg-slate-50">
                      <div>
                        <div className="text-xs font-bold text-slate-800">{item.name}</div>
                        <div className="text-[10px] text-emerald-600 font-extrabold">{item.price} zł / шт</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateDryCleanCount(item.id, -1)}
                          className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-xs text-slate-900">{count}</span>
                        <button
                          onClick={() => updateDryCleanCount(item.id, 1)}
                          className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {dryCleanCounts['carpet'] > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">Площадь ковра (м²):</span>
                  <input
                    type="number"
                    value={carpetArea}
                    onChange={(e) => setCarpetArea(Math.max(1, Number(e.target.value)))}
                    className="w-20 bg-white border border-amber-300 rounded-lg p-1.5 text-xs font-bold text-center"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Правая колонка: Итог, смета и создание */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Итоговая смета</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-emerald-400">{grandTotal} zł</span>
              <span className="text-xs text-slate-400">
                (Уборка: {cleaningBase + cleaningExtras} zł | Химчистка: {dryCleanTotal} zł)
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800">💬 Ответ для клиента в мессенджер</span>
              <button
                onClick={copyOffer}
                className="bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold px-3 py-1.5 rounded-lg transition border border-brand-200"
              >
                {copySuccess ? '✓ Скопировано!' : '📋 Скопировать'}
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 whitespace-pre-line font-mono leading-relaxed max-h-60 overflow-y-auto">
              {generateOfferText().replace(/<\/?b>/g, '')}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-800 block">⚡ Создать заказ в CRM</span>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Имя клиента"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Телефон (+48...)"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-700"
                />
              </div>
              <input
                type="text"
                placeholder="Адрес (Улица, дом, кв.)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2 text-xs"
              />
            </div>

            <button
              onClick={handleCreateOrder}
              disabled={creating}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm"
            >
              {creating ? 'Создание...' : '✓ Добавить заказ в CRM'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
