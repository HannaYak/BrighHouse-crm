"use client";
import React, { useState, useEffect, useRef } from 'react';

export default function CRM empresario ChatPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Загрузка списка диалогов
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        // Если чат уже выбран, обновляем его данные, чтобы видеть новые сообщения
        if (selectedConv) {
          const updated = data.find((c: any) => c.id === selectedConv.id);
          if (updated) setSelectedConv(updated);
        } else if (data.length > 0) {
          setSelectedConv(data[0]); // Автоматически выбираем первый чат
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки чатов:', e);
    } finally {
      setLoading(false);
    }
  };

  // Автоматическое обновление списка каждые 4 секунды (поллинг для живого чата)
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 4000);
    return () => clearInterval(interval);
  }, []);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConv?.messages]);

  // Отправка сообщения клиенту
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConv) return;

    const textToSend = messageText;
    setMessageText('');
    setSending(true);

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConv.id,
          text: textToSend,
        }),
      });

      if (res.ok) {
        await fetchConversations(); // Сразу обновляем список
      } else {
        alert('Ошибка при отправке сообщения');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] max-w-[1600px] mx-auto bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      
      {/* ЛЕВАЯ КОЛОНКА: Список диалогов */}
      <div className="w-96 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h1 className="text-base font-bold text-slate-900">💬 Чаты с клиентами</h1>
          <p className="text-xs text-slate-500">Входящие сообщения из мессенджеров</p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading && <div className="text-center py-10 text-xs text-slate-400">Загрузка диалогов...</div>}
          
          {!loading && conversations.length === 0 && (
            <div className="text-center py-12 px-4 text-slate-400 text-xs">
              Пока нет активных диалогов. Клиенты появятся здесь, когда напишут боту.
            </div>
          )}

          {conversations.map((conv) => {
            const lastMsg = conv.messages[conv.messages.length - 1];
            const isSelected = selectedConv?.id === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${
                  isSelected ? 'bg-brand-50/80 border-l-4 border-brand-600' : 'hover:bg-white'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                  {conv.channel === 'TELEGRAM' ? '✈️' : '💬'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {conv.clientName || 'Клиент'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {lastMsg ? lastMsg.text : 'Нет сообщений'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ПРАВАЯ КОЛОНКА: Окно переписки */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConv ? (
          <>
            {/* Шапка чата */}
            <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-slate-900">{selectedConv.clientName || 'Клиент'}</h2>
                <p className="text-[10px] text-slate-500">
                  Канал: <b className="text-blue-600">{selectedConv.channel}</b> • ID: {selectedConv.externalId}
                </p>
              </div>
            </div>

            {/* Список сообщений */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
              {selectedConv.messages.map((msg: any) => {
                const isManager = msg.senderType === 'MANAGER';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isManager ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                        isManager
                          ? 'bg-brand-600 text-white rounded-br-xs'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      <span className={`block text-[9px] mt-1 text-right ${isManager ? 'text-brand-200' : 'text-slate-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Поле ввода сообщения */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white flex gap-2">
              <input
                type="text"
                placeholder="Напишите ответ клиенту..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                disabled={sending || !messageText.trim()}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-sm"
              >
                {sending ? 'Отправка...' : 'Отправить ✈️'}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            Выберите чат слева, чтобы начать общение
          </div>
        )}
      </div>

    </div>
  );
}
