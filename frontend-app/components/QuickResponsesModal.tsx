"use client";
import React, { useState } from 'react';

interface QuickResponsesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const templates = [
  {
    title: '💰 Прейскурант и условия (Стандарт)',
    text: `Здравствуйте! ✨ В базовую уборку входит:\n- Обеспыливание всех открытых поверхностей\n- Мытье пола и плинтусов\n- Дезинфекция и чистка санузла (ванна, унитаз, раковина)\n- Мытье рабочей зоны кухни и фасадов\n\nПодскажите, сколько комнат и санузлов в вашей квартире, а также примерный метраж? Мы сразу рассчитаем точную стоимость и время уборки.`,
  },
  {
    title: '🧼 Генеральная уборка / После ремонта',
    text: `Здравствуйте! 🧹 Генеральная уборка включает тщательную очистку жировых и известковых налетов, очистку плиточных швов, дверей, радиаторов и труднодоступных мест.\n\nКакая общая площадь квартиры ($м^2$) и есть ли дополнительные задачи (мойка окон, внутри духовки/холодильника)?`,
  },
  {
    title: '📍 Запрос адреса и времени',
    text: `Отлично, предварительно зафиксировали! 📝\n\nПожалуйста, уточните:\n1. Точный адрес (улица, дом, номер квартиры, подъезд и код домофона)\n2. Удобное время начала\n3. Будет ли на месте наш или ваш пылесос?\n4. Есть ли домашние питомцы?`,
  },
  {
    title: '🛋️ Химчистка мебели',
    text: `Здравствуйте! ✨ Мы выполняем профессиональную экстракторную химчистку мебели и ковров немецкой химией.\n\nПрайс:\n- Диван 2-местный: 180 zł\n- Диван 3-местный: 200 zł\n- Угловой / 4-местный: 220 zł\n- Матрас (1 сторона): 90 zł\n\nПришлите, пожалуйста, фото вашей мебели для точной оценки пятен!`,
  },
  {
    title: '💳 Подтверждение бронирования',
    text: `Ваш заказ подтвержден! 🌸\nКлинер прибудет в назначенное время. Оплата производится после завершения уборки и проверки качества (наличными или переводом на карту/BLIK).\n\nЕсли возникнут вопросы или изменения по времени — сразу пишите нам!`,
  },
];

export default function QuickResponsesModal({ isOpen, onClose }: QuickResponsesModalProps) {
  if (!isOpen) return null;

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[85vh]">
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <h2 className="text-sm font-bold text-slate-800">Быстрые ответы для менеджера</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold">
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {templates.map((tpl, idx) => (
            <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2 hover:border-brand-400 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{tpl.title}</span>
                <button
                  onClick={() => copyToClipboard(tpl.text, idx)}
                  className={`text-[11px] font-bold px-3 py-1 rounded-lg transition ${
                    copiedIdx === idx
                      ? 'bg-emerald-600 text-white'
                      : 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs'
                  }`}
                >
                  {copiedIdx === idx ? '✓ Скопировано!' : 'Скопировать текст'}
                </button>
              </div>
              <pre className="text-[11px] text-slate-600 font-sans whitespace-pre-wrap leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100">
                {tpl.text}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
