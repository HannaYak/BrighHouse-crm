"use client";
import React, { useState } from 'react';

export interface OrderDetail {
  id: string;
  time: string;
  date: string;
  clientName: string;
  clientPhone: string;
  addressLine1: string;
  addressLine2: string;
  price: number;
  cleanersCount: number;
  assignedCleaners: string[];
  tags: { vacuum: boolean; pets: boolean; keys: boolean };
  clientNotes: string;
  serviceType: string;
}

interface OrderModalProps {
  order: OrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: OrderDetail) => void;
}

const availableCleaners = [
  { id: '1', name: 'Мария Сидорова', rating: 4.9 },
  { id: '2', name: 'Анна Ковальчук', rating: 4.8 },
  { id: '3', name: 'Елена Демченко', rating: 4.7 },
];

export default function OrderModal({ order, isOpen, onClose, onSave }: OrderModalProps) {
  if (!isOpen || !order) return null;

  const [formData, setFormData] = useState<OrderDetail>(order);

  const toggleTag = (key: keyof typeof formData.tags) => {
    setFormData((prev) => ({
      ...prev,
      tags: { ...prev.tags, [key]: !prev.tags[key] },
    }));
  };

  const toggleCleaner = (name: string) => {
    setFormData((prev) => {
      const exists = prev.assignedCleaners.includes(name);
      return {
        ...prev,
        assignedCleaners: exists
          ? prev.assignedCleaners.filter((c) => c !== name)
          : [...prev.assignedCleaners, name],
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl h-[85vh] max-h-[750px] flex flex-col overflow-hidden">
        
        {/* Верхняя панель модалки */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded">
              {formData.id}
            </span>
            <h2 className="text-base font-bold text-slate-800">
              Карточка заказа: {formData.clientName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Двухколоночный контент */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Левая колонка (60%) */}
          <div className="w-[60%] p-6 border-r border-slate-100 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Клиент
                  </label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:bg-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Телефон
                  </label>
                  <input
                    type="text"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:bg-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Дата
                  </label>
                  <input
                    type="text"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:bg-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Время
                  </label>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:bg-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Стоимость (zł)
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Адрес выполнения
                </label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="Улица, дом"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium mb-2 focus:bg-white focus:border-brand-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Квартира, этаж, домофон"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:bg-white focus:border-brand-500 focus:outline-none"
                />
              </div>

              {/* Схема локации */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Локация на карте
                </label>
                <div className="h-32 w-full bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400 font-medium">
                  🗺️ Интерактивная метка: {formData.addressLine1}
                </div>
              </div>
            </div>
          </div>

          {/* Правая колонка (40%) */}
          <div className="w-[40%] p-6 flex flex-col justify-between bg-slate-50/30 overflow-y-auto space-y-4">
            <div className="space-y-4">
              
              {/* Чекбоксы условий */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Параметры и Оборудование
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    { key: 'vacuum', label: '🔌 Нужен пылесос' },
                    { key: 'pets', label: '🐾 Есть животные' },
                    { key: 'keys', label: '🔑 Забрать/отдать ключи' },
                  ].map(({ key, label }) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => toggleTag(key as keyof typeof formData.tags)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between border transition ${
                        formData.tags[key as keyof typeof formData.tags]
                          ? 'bg-blue-50 border-brand-500 text-brand-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{label}</span>
                      <span>{formData.tags[key as keyof typeof formData.tags] ? '✓' : ''}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Назначение клинеров */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Назначить клинеров ({formData.assignedCleaners.length})
                </label>
                <div className="space-y-1.5">
                  {availableCleaners.map((cleaner) => {
                    const isSelected = formData.assignedCleaners.includes(cleaner.name);
                    return (
                      <button
                        type="button"
                        key={cleaner.id}
                        onClick={() => toggleCleaner(cleaner.name)}
                        className={`w-full px-3 py-2 rounded-lg text-xs flex items-center justify-between border transition ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>🙋‍♀️ {cleaner.name}</span>
                        <span className="text-[10px] text-slate-400">⭐ {cleaner.rating}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ТЗ и примечания от клиента */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  ТЗ / Пожелания клиента
                </label>
                <textarea
                  rows={3}
                  value={formData.clientNotes}
                  onChange={(e) => setFormData({ ...formData, clientNotes: e.target.value })}
                  placeholder="Особые пожелания, код от подъезда, зоны внимания..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Кнопка сохранения */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onSave(formData);
                  onClose();
                }}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs shadow-md transition"
              >
                Сохранить изменения
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
