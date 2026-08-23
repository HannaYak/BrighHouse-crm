"use client";
import React, { useState } from 'react';

interface QuickResponsesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const templates = [
  {
    title: '💰 Прейскурант и условия (Стандарт)',
    text: `Стандарт - лёгкая, освежающая уборка всех открытых поверхностей, до которых можно дотянуться без стремянки.\n\nЕсли желаете можем выслать подробный состав :)\n\nПодробные состав:\nВанная комната\n* Моем поверхность стиральной машины, открытые полки, умывальник, душевую кабину, ванну, зеркала, унитаз, дверь, пол, выключатели, розетки.\n\nКухня\n* Моем фасады кухонного гарнитура, фартук, столешницы, плиту, раковину, внутри шкафчика под мусор, (выкидываем мусор), дверь, пол, выключатели, розетки.\n\nКомнаты\n* Моем фасады мебели, протираем или пылесосим мягкую мебель, телевизор, подоконники, батареи, плинтуса, двери, столы и стулья, открытые полки, пол, выключатели, розетки.\n\nКоридор\n* Фасады мебели, открытые полки, зеркало, пол, плинтуса, выключатели, розетки, домофон (прочая техника).\n\nМеняем постельное белье по Вашему желанию.\nЗагружаем посуду в посудомойку.\n\nПодскажите, сколько комнат и санузлов в вашей квартире, а также примерный метраж? Мы сразу рассчитаем точную стоимость и время уборки.`,
  },
  {
    title: '🧼 Генеральная уборка',
    text: `Здравствуйте ☺️\nВ генеральную уборку входит уборка всех открытых поверхностей + очистка изнутри холодильника, вытяжки, СВЧ, духовки, посудомойки, стиральной машины, шкафчиков, ящиков, мойка стен, высоковисящих люстр и карнизов, отодвигание мебели для уборки под ней и очистка решётки вентиляции.\n\nЕсли желаете можем выслать подробный состав :)\n\nПодробный состав:\nВанная комната\n+ уборка внутри шкафов\n+ мойка вытяжки\n+ отодвигание мебели для уборки пыли\n+ протираем карнизы, люстры\n+ протираем стены, если на них есть загрязнения\n+ Моем поверхность стиральной машины, открытые полки, умывальник, душевую кабину, ванну, зеркала, унитаз, дверь, пол.\n\nКухня\n+ уборка внутри шкафов\n+ мойка холодильника\n+ мойка духовки\n+ мойка вытяжки\n+ протираем карнизы, люстры\n+ протираем стены\n+ Моем фасады кухонного гарнитура, столешницы, плиту, раковину, внутри шкафчика под мусор, дверь, пол.\n\nКомнаты и Коридор\n+ пылесосим внутри диванов\n+ уборка внутри шкафов\n+ отодвигание мебели для уборки пыли\n+ протираем карнизы, люстры, стены`,
  },
  {
    title: '🏗️ После ремонта',
    text: `Уборка строительной пыли и минимальных следов покраски\n\nВлажная и сухая уборка всех поверхностей в комнатах и на кухне (кроме потолков)\nВлажная уборка всех поверхностей в санузле (кроме потолков)\nМойка внутри и снаружи мебели, кухни`,
  },
  {
    title: '📍 Запрос адреса и времени',
    text: `Отлично! Записали Вас :)\nДля подтверждения заказа пришлите, пожалуйста, нам Ваши:\n1. Точный адрес\n2. Контактный телефон\n3. Проживают ли домашние питомцы\n4. Доступен ли на месте пылесос`,
  },
  {
    title: '💳 Подтверждение бронирования',
    text: `Ваш заказ подтвержден! 🌸\nОплата производится после завершения уборки и проверки качества (наличными, переводом на счёт/BLIK, PayPal, revolut).\n\nСпасибо за заказ и хорошего дня ☺️`,
  },
  {
    title: '🛋 Химчистка мебели',
    text: `Здравствуйте! ✨ Мы выполняем профессиональную экстракторную химчистку мебели и ковров.\n\nПришлите, пожалуйста, фото вашей мебели для точной оценки :)`,
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
