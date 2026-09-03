"use client";
import React, { useState } from 'react';

interface ExtraOption {
  id: string;
  name: string;
  price: number;
}

body: JSON.stringify({
  clientName: name,
  clientPhone: phone,
  addressLine1: address,
  serviceType: getTypeNameRu(),
  roomsCount: rooms,
  bathroomsCount: bathrooms,
  areaM2: area,
  price: totalPrice,
  date,
  startTime: time,
  notes: extrasSummary,
  hasOven: selectedExtras.includes('oven'),
  hasFridge: selectedExtras.includes('fridge'),
  hasMicrowave: selectedExtras.includes('microwave'),
  hasKitchenClosets: selectedExtras.includes('hood'),
  hasDishesHours: selectedExtras.includes('dishes') ? 1 : 0,
  hasBalcony: selectedExtras.includes('balcony'),
  hasIroningHours: selectedExtras.includes('ironing') ? 1 : 0,
  hasPets: selectedExtras.includes('pets'),
  windowsCount: standardWindows + balconyWindows,
}),

export default function PublicBookingPage() {
  const [cleaningType, setCleaningType] = useState<'STANDARD' | 'STANDARD_PLUS' | 'GENERAL' | 'POST_CONSTRUCTION'>('STANDARD');
  const [rooms, setRooms] = useState<number>(2);
  const [bathrooms, setBathrooms] = useState<number>(1);
  const [area, setArea] = useState<number>(50);

  // Окна
  const [standardWindows, setStandardWindows] = useState<number>(0);
  const [balconyWindows, setBalconyWindows] = useState<number>(0);

  // Допы
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

  // Контакты
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('10:00');
  const [comment, setComment] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Расчет стоимости
  const calculateBase = () => {
    if (cleaningType === 'STANDARD') return 160 + (rooms - 1) * 35 + (bathrooms - 1) * 45;
    if (cleaningType === 'STANDARD_PLUS') return 210 + (rooms - 1) * 45 + (bathrooms - 1) * 55;
    if (cleaningType === 'GENERAL') return 280 + (rooms - 1) * 65 + (bathrooms - 1) * 75;
    if (cleaningType === 'POST_CONSTRUCTION') return Math.max(380, area * 8);
    return 0;
  };

  const calculateExtras = () => {
    const fixed = selectedExtras.reduce((sum, id) => {
      const item = EXTRAS.find(e => e.id === id);
      return sum + (item ? item.price : 0);
    }, 0);
    return fixed + (standardWindows * 35) + (balconyWindows * 45);
  };

  const totalPrice = calculateBase() + calculateExtras();

  const toggleExtra = (id: string) => {
    setSelectedExtras(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getTypeNameRu = () => {
    if (cleaningType === 'STANDARD') return 'Стандартная уборка';
    if (cleaningType === 'STANDARD_PLUS') return 'Стандарт+';
    if (cleaningType === 'GENERAL') return 'Генеральная уборка';
    return 'Уборка после ремонта';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !address) {
      alert('Пожалуйста, укажите имя, телефон и адрес');
      return;
    }

    setLoading(true);
    try {
      const extrasSummary = [
        ...selectedExtras.map(id => EXTRAS.find(e => e.id === id)?.name),
        standardWindows > 0 ? `Обычные окна: ${standardWindows} шт` : '',
        balconyWindows > 0 ? `Балконные окна: ${balconyWindows} шт` : '',
        comment ? `Комментарий: ${comment}` : '',
      ].filter(Boolean).join(', ');

      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: name,
          clientPhone: phone,
          addressLine1: address,
          serviceType: getTypeNameRu(),
          roomsCount: rooms,
          bathroomsCount: bathrooms,
          areaM2: area,
          price: totalPrice,
          date,
          startTime: time,
          notes: extrasSummary,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrderNumber(data.orderNumber || 'Принят');
        setSuccess(true);
      } else {
        alert('Ошибка при оформлении заявки. Попробуйте еще раз.');
      }
    } catch {
      alert('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto">
            ✓
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Заявка принята!</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Спасибо, <b>{name}</b>! Ваш заказ <b>{orderNumber}</b> на сумму <b>{totalPrice} zł</b> успешно зарегистрирован. Мы свяжемся с вами в течение 10 минут для подтверждения времени!
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl text-xs text-left space-y-1 text-slate-600 border border-slate-100">
            <div>📍 <b>Адрес:</b> {address}</div>
            <div>📅 <b>Дата:</b> {date} в {time}</div>
            <div>✨ <b>Услуга:</b> {getTypeNameRu()}</div>
          </div>
          <button
            onClick={() => setSuccess(false)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition"
          >
            Рассчитать еще одну уборку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/70 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Шапка бренда */}
        <div className="text-center space-y-2">
          <span className="text-xs font-extrabold tracking-widest text-brand-600 uppercase bg-brand-50 border border-brand-100 px-3 py-1 rounded-full">
            BrightHouse Cleaning
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Онлайн-калькулятор и бронирование</h1>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            Рассчитайте точную стоимость уборки за 30 секунд. Весь профессиональный инвентарь и эко-химия уже включены в цену.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Левая колонка: Опции */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            {/* 4 типа уборки */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">1. Выберите тариф</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'STANDARD', label: '✨ Стандарт' },
                  { id: 'STANDARD_PLUS', label: '⭐ Стандарт+' },
                  { id: 'GENERAL', label: '🧼 Генеральная' },
                  { id: 'POST_CONSTRUCTION', label: '🏗 Ремонт' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCleaningType(t.id as any)}
                    className={`py-3 px-2 rounded-2xl text-xs font-bold border transition text-center ${
                      cleaningType === t.id
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Комнаты и санузлы */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">2. Параметры жилья</label>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Комнат</span>
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setRooms(Math.max(1, rooms - 1))} className="w-7 h-7 bg-white rounded-lg font-bold border text-xs">-</button>
                    <span className="font-extrabold text-sm">{rooms}</span>
                    <button type="button" onClick={() => setRooms(rooms + 1)} className="w-7 h-7 bg-white rounded-lg font-bold border text-xs">+</button>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Санузлов</span>
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setBathrooms(Math.max(1, bathrooms - 1))} className="w-7 h-7 bg-white rounded-lg font-bold border text-xs">-</button>
                    <span className="font-extrabold text-sm">{bathrooms}</span>
                    <button type="button" onClick={() => setBathrooms(bathrooms + 1)} className="w-7 h-7 bg-white rounded-lg font-bold border text-xs">+</button>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Площадь м²</span>
                  <input
                    type="number"
                    value={area}
                    onChange={(e) => setArea(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs font-extrabold text-center"
                  />
                </div>
              </div>
            </div>

            {/* Мытье окон */}
            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">🪟 Мытье окон с двух сторон</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-2.5 rounded-xl border border-blue-100 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold">Обычное (35 zł)</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setStandardWindows(Math.max(0, standardWindows - 1))} className="w-6 h-6 bg-slate-100 rounded font-bold text-xs">-</button>
                    <span className="font-bold text-xs w-4 text-center">{standardWindows}</span>
                    <button type="button" onClick={() => setStandardWindows(standardWindows + 1)} className="w-6 h-6 bg-slate-100 rounded font-bold text-xs">+</button>
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-blue-100 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold">Балконное (45 zł)</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setBalconyWindows(Math.max(0, balconyWindows - 1))} className="w-6 h-6 bg-slate-100 rounded font-bold text-xs">-</button>
                    <span className="font-bold text-xs w-4 text-center">{balconyWindows}</span>
                    <button type="button" onClick={() => setBalconyWindows(balconyWindows + 1)} className="w-6 h-6 bg-slate-100 rounded font-bold text-xs">+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Дополнительные услуги */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">3. Дополнительные опции</label>
              <div className="grid grid-cols-2 gap-2">
                {EXTRAS.map(extra => {
                  const active = selectedExtras.includes(extra.id);
                  return (
                    <div
                      key={extra.id}
                      onClick={() => toggleExtra(extra.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex justify-between items-center text-xs ${
                        active
                          ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-950'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{extra.name}</span>
                      <span className="text-[11px] font-extrabold text-emerald-600">+{extra.price} zł</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Правая колонка: Итог и контакты */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Стоимость вашей уборки</span>
              <div className="text-4xl font-black text-emerald-400 mt-2">{totalPrice} zł</div>
              <div className="text-[11px] text-slate-400 mt-2">
                Включает тариф {getTypeNameRu()}, инвентарь и моющие средства. Оплата после завершения.
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">4. Контактные данные</span>

              <div>
                <input
                  type="text"
                  placeholder="Ваше имя *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <input
                  type="tel"
                  placeholder="Номер телефона (+48...) *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Адрес (Улица, номер дома и кв.) *"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700"
                  required
                />
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700"
                >
                  <option value="09:00">09:00 Утро</option>
                  <option value="10:00">10:00 Утро</option>
                  <option value="13:00">13:00 День</option>
                  <option value="15:00">15:00 День</option>
                  <option value="17:00">17:00 Вечер</option>
                </select>
              </div>

              <div>
                <textarea
                  rows={2}
                  placeholder="Комментарий или код домофона (необязательно)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl text-xs transition shadow-md"
              >
                {loading ? 'Оформление...' : '✓ Забронировать уборку'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
