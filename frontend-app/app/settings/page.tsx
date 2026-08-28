"use client";
import React, { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

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
    cleanerRatePercent: 40,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setFormData(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        alert('✅ Настройки успешно сохранены');
      } else {
        alert('Ошибка при сохранении');
      }
    } catch {
      alert('Ошибка соединения с сервером');
    } finally {
      setSaving(false);
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

  if (loading) return <div className="p-10 text-center text-slate-500 text-xs">Загрузка настроек...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-xl font-bold text-slate-900">⚙️ Настройки компании и реквизиты</h1>
        <p className="text-xs text-slate-500">Юридические данные, платежные реквизиты BLIK/IBAN и базовые ставки</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Форма настроек */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* Блок 1: Профиль и контакты */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
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
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">💳 Реквизиты для приема оплат</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Номер телефона для BLIK</label>
                <input
                  type="text"
                  name="blikPhone"
                  placeholder="+48 000 000 000"
                  value={formData.blikPhone || ''}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-brand-700"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Получатель платежа</label>
                <input
                  type="text"
                  name="recipientName"
                  placeholder="Имя Фамилия / Название Sp. z o.o."
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

          {/* Блок 3: Финансовые ставки */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">💰 Базовые выплаты персоналу</h2>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Ставка клинера (% от суммы заказа по умолчанию)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  name="cleanerRatePercent"
                  value={formData.cleanerRatePercent}
                  onChange={handleChange}
                  className="w-32 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800"
                />
                <span className="text-xs font-bold text-slate-500">%</span>
                <span className="text-[11px] text-slate-400">
                  (Остальные {100 - (Number(formData.cleanerRatePercent) || 40)}% — маржа компании)
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-sm"
          >
            {saving ? 'Сохранение...' : '💾 Сохранить изменения'}
          </button>
        </form>

        {/* Правая колонка: Быстрое копирование реквизитов для клиента */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800">📋 Сообщение с реквизитами</span>
              <button
                onClick={copyPaymentDetails}
                className="bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold px-3 py-1.5 rounded-lg transition border border-brand-200"
              >
                {copySuccess ? '✓ Скопировано!' : 'Скопировать'}
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Этот текст можно отправить клиенту в Telegram или WhatsApp, когда он готов оплатить заказ:
            </p>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 whitespace-pre-line font-mono leading-relaxed">
              {getPaymentDetailsText()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
