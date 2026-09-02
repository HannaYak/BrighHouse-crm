'use client';

import { useState } from 'react';

export default function ChatPage() {
  const [selectedChat, setSelectedChat] = useState<number | null>(null);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Список диалогов */}
      <div className="w-80 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Сообщения</h2>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            Telegram / Direct
          </span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          <div
            onClick={() => setSelectedChat(1)}
            className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
              selectedChat === 1 ? 'bg-blue-50/60' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm text-slate-900">Тестовый клиент</span>
              <span className="text-xs text-slate-400">12:30</span>
            </div>
            <p className="text-xs text-slate-500 truncate">
              Здравствуйте! Хочу заказать генеральную уборку...
            </p>
          </div>
        </div>
      </div>

      {/* Окно переписки */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {selectedChat ? (
          <>
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Тестовый клиент</h3>
                <span className="text-xs text-emerald-600">В сети</span>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 text-slate-800 text-sm p-3 rounded-2xl rounded-tl-none max-w-md shadow-sm">
                  Здравствуйте! Хочу заказать генеральную уборку квартиры.
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
              <input
                type="text"
                placeholder="Напишите ответ..."
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Отправить
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Выберите диалог из списка слева
          </div>
        )}
      </div>
    </div>
  );
}
