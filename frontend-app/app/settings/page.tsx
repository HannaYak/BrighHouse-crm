"use client";
import React, { useState, useEffect } from 'react';

interface AddonRateItem {
  id?: number;
  code: string;
  name: string;
  price: number;
  durationMins: number;
  category?: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'addons'>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Настройки компании
  const [formData, setFormData] = useState({
    companyName: 'BrightHouse Cleaning',
    nip: '',
    phone: '',
    email: '',
    city: 'Warszawa',
    address: '',
    instagram: '',
    bankName: '',
    accountNumber: '',
    blikPhone: '',
    recipientName: '',
  });

  // Тарифы дополнительных услуг
  const [addons, setAddons] = useState<AddonRateItem[]>([]);
  const [savingAddons, setSavingAddons] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        const [resSettings, resAddons] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/settings/addons'),
        ]);

        if (resSettings.ok) {
          const data = await resSettings.json();
          setFormData((prev) => ({ ...prev, ...data }));
        }

        if (resAddons.ok) {
          const addonsData = await resAddons.json();
          if (Array.isArray(addonsData) && addonsData.length > 0) {
            setAddons(addonsData);
          } else {
            // Дефолтный список, если база еще не заполнена
            setAddons([
              { code: 'window', name: 'Окно стандартное', price: 35, durationMins: 30 },
              { code: 'balconyWindow', name: 'Окно балконное', price: 45, durationMins: 40 },
              { code: 'showcaseWindow', name: 'Витрина', price: 50, durationMins: 40 },
              { code: 'oven', name: 'Духовка', price: 45, durationMins: 30 },
              { code: 'fridge', name: 'Холодильник', price: 35, durationMins: 30 },
              { code: 'fridgeFreeze', name: 'Морозильная камера', price: 50, durationMins: 45 },
              { code: 'microwave', name: 'Микроволновка', price: 20, durationMins: 15 },
              { code: 'kitchenClosets', name: 'Кухонные шкафы внутри', price: 100, durationMins: 60 },
              { code: 'balcony', name: 'Уборка балкона', price: 35, durationMins: 30 },
              { code: 'steamer', name: 'Пароочиститель', price: 75, durationMins: 45 },
              { code: 'vacuum', name: 'Пылесос компании', price: 30, durationMins: 0 },
            ]);
          }
        }
      } catch (e) {
        console.error('Ошибка загрузки настроек:', e);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        alert('✅ Реквизиты компании сохранены');
      } else {
        alert('Ошибка при сохранении');
      }
    } catch {
      alert('Ошибка соединения с сервером');
    } finally {
      setSaving(false);
    }
  };

  const handleAddonChange = (index: number, field: 'price' | 'durationMins', value: number) => {
    setAddons((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: Math.max(0, value) };
      return updated;
    });
  };

  const handleSaveAddons = async () => {
    setSavingAddons(true);
    try {
      const res = await fetch('/api/settings/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addons }),
      });
      if (res.ok) {
        alert('✅ Тарифы доп. услуг обновлены');
      } else {
        alert('Ошибка при сохранении тарифов');
      }
    } catch {
      alert('Ошибка соединения');
    } finally {
      setSavingAddons(false);
    }
  };

  const getPaymentDetailsText = () => {
    return `💳 Реквизиты для оплаты BrightHouse:

📲 BLIK на номер: ${formData.blikPhone || 'уточняется'}
🏦 Банковский перевод:
• Получатель: ${formData.recipientName || formData.companyName}
• Номер счета (IBAN): ${formData.accountNumber || 'уточняется'}
• Банк: ${formData.bankName || 'Банк'}
• Назначение платежа: Оплата уборки (номер заказа)`;
  };

  const copyPaymentDetails = () => {
    navigator.clipboard.writeText(getPaymentDetailsText());
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-500 text-xs">Загрузка настроек...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">⚙️ Настройки системы</h1>
          <p className="text-xs text-slate-500">Реквизиты компании, прием оплат и базовые цены услуг</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('company')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'company'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏢 Реквизиты и счета
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('addons')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'addons'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏷 Цены доп. услуг ({addons.length})
          </button>
        </div>
      </div>

      {activeTab === 'company' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleSaveCompany} className="lg:col-span-7 space-y-5">
            {/* Блок 1: Профиль и контакты */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">🏢 Профиль компании</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Название сервиса</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName || ''}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">NIP компании</label>
                  <input
                    type="text"
                    name="nip"
                    placeholder="1234567890"
                    value={formData.nip || ''}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Телефон для связи</label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="+48..."
                    value={formData.phone || ''}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Instagram</label>
                  <input
                    type="text"
                    name="instagram"
                    placeholder="@brighthouse.pl"
                    value={formData.instagram || ''}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Город и адрес офиса</label>
                <input
                  type="text"
                  name="address"
                  placeholder="Warszawa, ul. ..."
                  value={formData.address || ''}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Блок 2: Банковские реквизиты */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">💳 Реквизиты для оплат</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Телефон для BLIK</label>
                  <input
                    type="text"
                    name="blikPhone"
                    placeholder="+48 000 000 000"
                    value={formData.blikPhone || ''}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-blue-600"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Получатель платежа</label>
                  <input
                    type="text"
                    name="recipientName"
                    placeholder="Имя Фамилия / BrightHouse"
                    value={formData.recipientName || ''}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Номер счета (IBAN)</label>
                <input
                  type="text"
                  name="accountNumber"
                  placeholder="PL 00 0000 0000 0000 0000 0000 0000"
                  value={formData.accountNumber || ''}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Название банка</label>
                <input
                  type="text"
                  name="bankName"
                  placeholder="Santander / mBank / PKO"
                  value={formData.bankName || ''}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-xs cursor-pointer"
            >
              {saving ? 'Сохранение...' : '💾 Сохранить реквизиты'}
            </button>
          </form>

          {/* Правая колонка: Реквизиты для клиента */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800">📋 Сообщение с реквизитами</span>
                <button
                  type="button"
                  onClick={copyPaymentDetails}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg transition border border-blue-200 cursor-pointer"
                >
                  {copySuccess ? '✓ Скопировано!' : 'Скопировать'}
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                Готовое сообщение для отправки клиенту в чат при согласовании безналичной оплаты:
              </p>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 whitespace-pre-line font-mono leading-relaxed">
                {getPaymentDetailsText()}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Вкладка тарифов доп. услуг */
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                🏷 Базовые расценки на доп. опции
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Эти цены автоматически подтягиваются в Калькулятор и Модалку заказа
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveAddons}
              disabled={savingAddons}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
            >
              {savingAddons ? 'Сохранение...' : '💾 Сохранить тарифы'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5">Услуга</th>
                  <th className="py-2.5 w-36">Цена (zł)</th>
                  <th className="py-2.5 w-36">Время (мин)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {addons.map((addon, idx) => (
                  <tr key={addon.code} className="hover:bg-slate-50/60">
                    <td className="py-3 font-semibold text-slate-800">
                      {addon.name}
                      <span className="text-[10px] text-slate-400 font-mono ml-2">({addon.code})</span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={addon.price}
                          onChange={(e) => handleAddonChange(idx, 'price', Number(e.target.value))}
                          className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-800"
                        />
                        <span className="text-slate-400 text-xs">zł</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={addon.durationMins}
                          onChange={(e) => handleAddonChange(idx, 'durationMins', Number(e.target.value))}
                          className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-800"
                        />
                        <span className="text-slate-400 text-xs">мин</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
