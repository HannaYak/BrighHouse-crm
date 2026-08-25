"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ExtraService {
  id: string;
  name: string;
  price: number;
}

const EXTRA_SERVICES: ExtraService[] = [
  { id: 'oven', name: '🧽 Мытье духовки изнутри', price: 50 },
  { id: 'fridge', name: '🧊 Мытье холодильника изнутри', price: 50 },
  { id: 'microwave', name: '📻 Мытье микроволновки', price: 25 },
  { id: 'hood', name: '💨 Мытье вытяжки', price: 40 },
  { id: 'dishes', name: '🍽 Мытье посуды вручную', price: 40 },
  { id: 'balcony', name: '🌿 Уборка балкона / лоджии', price: 60 },
  { id: 'windows', name: '🪟 Мытье стандартных окон (за 1 шт)', price: 35 },
  { id: 'ironing', name: '👔 Глажка белья (за 1 час)', price: 50 },
  { id: 'pets', name: '🐾 Доплата за шерсть питомцев', price: 30 },
];

export default function CalculatorPage() {
  const router = useRouter();

  // Параметры уборки
  const [cleaningType, setCleaningType] = useState<'STANDARD' | 'GENERAL' | 'POST_CONSTRUCTION'>('STANDARD');
  const [rooms, setRooms] = useState<number>(2);
  const [bathrooms, setBathrooms] = useState<number>(1);
  const [area, setArea] = useState<number>(50);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [windowCount, setWindowCount] = useState<number>(2);

  // Данные клиента
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [copySuccess, setCopySuccess] = useState(false);
  const [creating, setCreating] = useState(false);

  // Логика расчета базовой стоимости
  const calculateBasePrice = () => {
    let base = 0;
    if (cleaningType === 'STANDARD') {
      base = 160 + (rooms - 1) * 35 + (bathrooms - 1) * 45;
    } else if (cleaningType === 'GENERAL') {
      base = 260 + (rooms - 1) * 60 + (bathrooms - 1) * 70;
    } else if (cleaningType === 'POST_CONSTRUCTION') {
      // Расчет от квадратуры для послестроя
      base = Math.max(350, area * 8);
    }
    return base;
  };

  const calculateExtrasPrice = () => {
    return selectedExtras.reduce((sum, extraId) => {
      if (extraId === 'windows') {
        return sum + windowCount * 35;
      }
      const item = EXTRA_SERVICES.find(e => e.id === extraId);
      return sum + (item ? item.price : 0);
    }, 0);
  };

  const basePrice = calculateBasePrice();
  const extrasPrice = calculateExtrasPrice();
  const totalPrice = basePrice + extrasPrice;

  const toggleExtra = (id: string) => {
    setSelectedExtras(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getTypeNameRu = () => {
    if (cleaningType === 'STANDARD') return 'Стандартная уборка';
    if (cleaningType === 'GENERAL') return 'Генеральная уборка';
    return 'Уборка после ремонта';
  };

  // Текст коммерческого предложения для клиента
  const generateOfferText = () => {
    const extrasList = selectedExtras
      .map(id => {
        if (id === 'windows') return `• Мытье окон (${windowCount} шт.) — ${windowCount * 35} zł`;
        const item = EXTRA_SERVICES.find(e => e.id === id);
        return item ? `• ${item.name} — ${item.price} zł` : '';
      })
      .filter(Boolean)
      .join('\n');

    return `Здравствуйте${clientName ? `, ${clientName}` : ''}! 🌸

Расчет стоимости вашей уборки:
✨ <b>${getTypeNameRu()}</b> (${rooms} комн., ${bathrooms} санузел${bathrooms > 1 ? 'а' : ''}${area ? `, ~${area} м²` : ''}) — <b>${basePrice} zł</b>
${extrasList ? `\nДополнительные услуги:\n${extrasList}` : ''}

💰 <b>Итоговая стоимость: ${totalPrice} zł</b>

В стоимость включен весь профессиональный инвентарь и моющие средства. Оплата производится после завершения уборки и проверки вами качества.

Подскажите, пожалуйста, какой день и время для вас будут наиболее удобны? ☺️`;
  };

  const copyOffer = () => {
    // Копируем чистый текст без тегов <b> для буфера обмена
    const plainText = generateOfferText().replace(/<\/?b>/g, '');
    navigator.clipboard.writeText(plainText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Автоматическое создание заказа прямо из калькулятора
  const handleCreateOrder = async () => {
    setCreating(true);
    try {
      const orderPayload = {
        clientName: clientName || 'Клиент из калькулятора',
        clientPhone: clientPhone || '',
        addressLine1: address || 'Адрес уточняется',
        serviceType: getTypeNameRu(),
        price: totalPrice,
        date: new Date(date).toISOString(),
        status: 'NEW',
        notes: `Рассчитано в калькуляторе. Доп. услуги: ${selectedExtras.join(', ')}`,
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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">🧮 Умный калькулятор и смета</h1>
        <p className="text-xs text-slate-500">Быстрый расчет стоимости, генерация ответа клиенту и создание заказа в 1 клик</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Левая колонка: Настройка параметров уборки */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Тип уборки */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Тип уборки
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'STANDARD', label: '✨ Стандарт' },
                { id: 'GENERAL', label: '🧼 Генеральная' },
                { id: 'POST_CONSTRUCTION', label: '🏗 После ремонта' },
              ].map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setCleaningType(type.id as any)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border ${
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Комнаты</label>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setRooms(Math.max(1, rooms - 1))}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 font-bold text-slate-600"
                >
                  -
                </button>
                <span className="flex-1 text-center font-bold text-xs text-slate-900">{rooms}</span>
                <button
                  onClick={() => setRooms(rooms + 1)}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 font-bold text-slate-600"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Санузлы</label>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setBathrooms(Math.max(1, bathrooms - 1))}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 font-bold text-slate-600"
                >
                  -
                </button>
                <span className="flex-1 text-center font-bold text-xs text-slate-900">{bathrooms}</span>
                <button
                  onClick={() => setBathrooms(bathrooms + 1)}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 font-bold text-slate-600"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Площадь (м²)</label>
              <input
                type="number"
                value={area}
                onChange={(e) => setArea(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl p-2 text-xs font-bold text-center text-slate-800"
              />
            </div>
          </div>

          {/* Дополнительные услуги */}
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
                    className={`p-3 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs">{extra.name}</span>
                    <span className="text-xs font-extrabold text-emerald-600">+{extra.price} zł</span>
                  </div>
                );
              })}
            </div>

            {selectedExtras.includes('windows') && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">Количество окон:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWindowCount(Math.max(1, windowCount - 1))}
                    className="w-7 h-7 bg-white rounded-lg border border-blue-200 font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="font-extrabold text-xs text-blue-900 w-6 text-center">{windowCount}</span>
                  <button
                    onClick={() => setWindowCount(windowCount + 1)}
                    className="w-7 h-7 bg-white rounded-lg border border-blue-200 font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Правая колонка: Итог, текст для мессенджера и быстрое создание */}
        <div className="lg:col-span-5 space-y-4">
          {/* Плашка итоговой суммы */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Итоговый расчет</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-emerald-400">{totalPrice} zł</span>
              <span className="text-xs text-slate-400">({basePrice} базовая + {extrasPrice} допы)</span>
            </div>
          </div>

          {/* Превью готового ответа клиенту */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800">💬 Готовый ответ для клиента</span>
              <button
                onClick={copyOffer}
                className="bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold px-3 py-1.5 rounded-lg transition border border-brand-200"
              >
                {copySuccess ? '✓ Скопировано!' : '📋 Скопировать'}
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 whitespace-pre-line font-mono leading-relaxed">
              {generateOfferText().replace(/<\/?b>/g, '')}
            </div>
          </div>

          {/* Блок быстрого бронирования заказа */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-800 block">⚡ Сразу создать заказ в CRM</span>
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
              {creating ? 'Создание...' : '✓ Добавить заказ на Канбан-доску'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
