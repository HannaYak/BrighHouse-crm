"use client";
import React, { useState, useEffect } from 'react';

const DAYS_OF_WEEK = [
  { id: 1, label: 'Понедельник' },
  { id: 2, label: 'Вторник' },
  { id: 3, label: 'Среда' },
  { id: 4, label: 'Четверг' },
  { id: 5, label: 'Пятница' },
  { id: 6, label: 'Суббота' },
  { id: 7, label: 'Воскресенье' },
];

export default function SchedulePage() {
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCleaner, setSelectedCleaner] = useState<any>(null);

  // Стейты для редактирования смен в модалке
  const [workDays, setWorkDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('20:00');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cleaners');
      if (res.ok) {
        setCleaners(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openScheduleModal = (cleaner: any) => {
    setSelectedCleaner(cleaner);
    setWorkDays(cleaner.workDays || [1, 2, 3, 4, 5]);
    setStartTime(cleaner.defaultStartTime || '08:00');
    setEndTime(cleaner.defaultEndTime || '20:00');
  };

  const handleSave = async () => {
    if (!selectedCleaner) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cleaners/${selectedCleaner.id}/schedule`, {
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
        alert('График успешно обновлен!');
        setSelectedCleaner(null);
        loadData();
      } else {
        alert('Ошибка сохранения');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-xs text-slate-500">Загрузка графиков...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📅 График работы и смены клинеров</h1>
          <p className="text-xs text-slate-500">Управление рабочими часами и днями недели для всей команды</p>
        </div>
      </div>

      {/* Таблица сотрудников и их графиков */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Сотрудники ({cleaners.length})</h2>
        </div>

        <div className="divide-y divide-slate-100">
          {cleaners.map((cleaner) => {
            const days = cleaner.workDays || [1, 2, 3, 4, 5];
            return (
              <div key={cleaner.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{cleaner.name}</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold">
                      ⏰ {cleaner.defaultStartTime || '08:00'} — {cleaner.defaultEndTime || '20:00'}
                    </span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {DAYS_OF_WEEK.map((d) => {
                      const isWork = days.includes(d.id);
                      return (
                        <span
                          key={d.id}
                          className={`w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center border ${
                            isWork
                              ? 'bg-emerald-500 text-white border-emerald-600'
                              : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}
                          title={d.label}
                        >
                          {d.label.slice(0, 2)}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openScheduleModal(cleaner)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  ⚙️ Изменить график
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Модальное окно редактирования смен */}
      {selectedCleaner && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">График: {selectedCleaner.name}</h3>
              <button onClick={() => setSelectedCleaner(null)} className="font-bold text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-2">Рабочие дни недели:</label>
                <div className="grid grid-cols-4 gap-2">
                  {DAYS_OF_WEEK.map((d) => {
                    const active = workDays.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setWorkDays(active ? workDays.filter(x => x !== d.id) : [...workDays, d.id]);
                        }}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">С каких часов:</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">До каких часов:</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-sm"
              >
                {saving ? 'Сохранение...' : 'Сохранить смены'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
