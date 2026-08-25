"use client";
import React, { useState } from 'react';

export default function WidgetSettingsPage() {
  const [copied, setCopied] = useState(false);

  // HTML/JS код виджета, который можно вставить на любой сайт (Tilda, WordPress, HTML)
  const widgetCode = `<div id="brighthouse-booking-widget"></div>
<script>
  (function() {
    const container = document.getElementById('brighthouse-booking-widget');
    container.innerHTML = \`
      <div style="font-family: sans-serif; max-width: 400px; padding: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <h3 style="margin-top: 0; font-size: 16px; color: #0f172a; margin-bottom: 15px;">🌸 Заказать уборку</h3>
        <form id="bh-form" style="display: flex; flex-direction: column; gap: 10px;">
          <input type="text" id="bh-name" placeholder="Ваше имя" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px;" />
          <input type="tel" id="bh-phone" placeholder="Телефон (+48...)" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px;" />
          <input type="text" id="bh-address" placeholder="Адрес в Варшаве" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px;" />
          <input type="date" id="bh-date" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px;" />
          <button type="submit" style="background: #059669; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px;">Забронировать уборку</button>
        </form>
        <div id="bh-success" style="display: none; color: #059669; font-weight: bold; text-align: center; margin-top: 10px;">Спасибо! Заявка принята, мы скоро свяжемся.</div>
      </div>
    \`;

    document.getElementById('bh-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const data = {
        name: document.getElementById('bh-name').value,
        phone: document.getElementById('bh-phone').value,
        address: document.getElementById('bh-address').value,
        date: document.getElementById('bh-date').value,
        service: 'STANDARD',
        timeSlot: '10:00 — 14:00',
        price: 250
      };

      try {
        const res = await fetch('${typeof window !== 'undefined' ? window.location.origin : ''}/api/leads/public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          document.getElementById('bh-form').style.display = 'none';
          document.getElementById('bh-success').style.display = 'block';
        } else {
          alert('Ошибка отправки. Попробуйте позже.');
        }
      } catch (err) {
        alert('Ошибка соединения.');
      }
    });
  })();
</script>`;

  const copyCode = () => {
    navigator.clipboard.writeText(widgetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">🧩 Виджет бронирования для сайта</h1>
        <p className="text-xs text-slate-500">Установите этот код на ваш сайт, чтобы заявки автоматически попадали в Канбан</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800">Готовый код виджета (HTML / JS)</h2>
          <button
            onClick={copyCode}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm"
          >
            {copied ? '✅ Скопировано!' : '📋 Скопировать код'}
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Вставьте этот блок кода в любое место вашего сайта (на Тильде через блок HTML, в WordPress или кастомный сайт). Когда клиент заполнит форму, заказ мгновенно появится в колонке <b>«📥 Новые»</b> на вашей Канбан-доске, а вам прилетит уведомление в Telegram!
        </p>

        <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-[11px] font-mono overflow-x-auto">
          <pre>{widgetCode}</pre>
        </div>
      </div>
    </div>
  );
}
