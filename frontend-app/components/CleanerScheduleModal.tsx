"use client";
import React, { useState } from 'react';

const DAYS = [
  { id: 1, label: 'Пн' },
  { id: 2, label: 'Вт' },
  { id: 3, label: 'Ср' },
  { id: 4, label: 'Чт' },
  { id: 5, label: 'Пт' },
  { id: 6, label: 'Сб' },
  { id: 7, label: 'Вс' },
];

export default function CleanerScheduleModal({
  cleaner,
  isOpen,
  onClose,
  onSaved,
}: {
  cleaner: any;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [workDays, setWorkDays] = useState<number[]>(cleaner?.workDays || [1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState(cleaner?.defaultStartTime || '08:00');
  const [endTime, setEndTime] = useState(cleaner?.defaultEndTime || '20:00');

  // Для разового исключения/смены
  const [singleDate, setSingleDate] = useState(new Date().toISOString().slice(0, 10));
  const [singleIsWorking, setSingleIsWorking] = useState(true);
  const [singleStart, setSingleStart] = useState('08:00');
  const [singleEnd, setSingleEnd] = useState('20:00');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !cleaner) return null;

  const toggleDay = (id: number) => {
    setWorkDays((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const handleSaveTemplate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cleaners/${cleaner.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TEMPLATE',
          workDays,
          defaultStartTime: startTime,
          defaultEndTime: endTime,
        }),
      });
      if (res.ok) {
        alert('Постоянный график успешно сохранен!');
        onSaved();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSingleShift = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cleaners/${cleaner.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SINGLE_DAY',
          date: singleDate,
          isWorking: singleIsWorking,
          startTime: singleStart,
          endTime: singleEnd,
        }),
      });
      if (res.ok) {
        alert(`Смена на ${singleDate} сохранена!`);
        onSaved();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">📅 График: {cleaner.name}</h2>
            <p className="text-xs text-slate-500">Настройка постоянных смен и плавающего времени</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold">✕</button>
        </div>

        {/* БЛОК 1: Постоянный график (шаблон) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <span className="text-xs font-bold uppercase text-slate-700 block">1. Постоянный график (по дням недели)</span>
          <div className="flex gap-1.5">
            {DAYS.map((d) => {
              const active = workDays.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDay(d.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${
                    active ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Время С:</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Время ДО:</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition"
          >
            Сохранить постоянный график
          </button>
        </div>

        {/* БЛОК 2: Точечный день / отгул */}
        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 space-y-3">
          <span className="text-xs font-bold uppercase text-amber-900 block">2. Изменить конкретный день (Выходной / Другие часы)</span>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              className="bg-white border border-amber-200 rounded-lg p-2 text-xs font-bold"
            />
            <select
              value={singleIsWorking ? 'work' : 'off'}
              onChange={(e) => setSingleIsWorking(e.target.value === 'work')}
              className="bg-white border border-amber-200 rounded-lg p-2 text-xs font-bold"
            >
              <option value="work">✅ Рабочий день</option>
              <option value="off">🚫 Выходной / Отгул</option>
            </select>
          </div>

          {singleIsWorking && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="time"
                value={singleStart}
                onChange={(e) => setSingleStart(e.target.value)}
                className="bg-white border border-amber-200 rounded-lg p-2 text-xs"
              />
              <input
                type="time"
                value={singleEnd}
                onChange={(e) => setSingleEnd(e.target.value)}
                className="bg-white border border-amber-200 rounded-lg p-2 text-xs"
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveSingleShift}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 rounded-xl transition"
          >
            Применить на эту дату
          </button>
        </div>
      </div>
    </div>
  );
}
