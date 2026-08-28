"use client";
import React, { useState, useEffect, useRef } from 'react';

export default function ChatsPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChats = async (selectFirst = false) => {
    try {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0 && (selectFirst || !selectedChat)) {
          setSelectedChat(data[0]);
        } else if (selectedChat) {
          const updated = data.find((c: any) => c.id === selectedChat.id);
          if (updated) setSelectedChat(updated);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChats(true);
    // Автообновление сообщений каждые 4 секунды
    const interval = setInterval(() => loadChats(false), 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedChat || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedChat.id,
          text: messageText.trim(),
        }),
      });

      if (res.ok) {
        setMessageText('');
        loadChats(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500 text-xs">Загрузка диалогов...</div>;

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div>
        <h1 className="text-xl font-bold text-slate-900">💬 Диалоги и чат Telegram</h1>
        <p className="text-xs text-slate-500">Живая переписка с клиентами бота прямо из панели CRM</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm">
        {/* Список диалогов слева */}
        <div className="md:col-span-4 border-r border-slate-200 flex flex-col h-full overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Все диалоги ({conversations.length})</span>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">● Live</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {conversations.map((chat) => {
              const isSelected = selectedChat?.id === chat.id;
              const lastMessage = chat.messages?.[chat.messages.length - 1];

              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-3.5 cursor-pointer transition ${
                    isSelected ? 'bg-brand-50 border-l-4 border-brand-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {chat.clientName || 'Пользователь Telegram'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {lastMessage ? new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1 truncate">
                    {lastMessage ? (
                      <span>{lastMessage.senderType === 'MANAGER' ? 'Вы: ' : ''}{lastMessage.text}</span>
                    ) : (
                      <span className="italic text-slate-400">Новый диалог</span>
                    )}
                  </p>
                </div>
              );
            })}

            {conversations.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                Пока нет активных диалогов.<br />Сообщения от клиентов бота появятся здесь автоматически.
              </div>
            )}
          </div>
        </div>

        {/* Окно переписки справа */}
        <div className="md:col-span-8 flex flex-col h-full overflow-hidden">
          {selectedChat ? (
            <>
              {/* Шапка чата */}
              <div className="p-3.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>👤 {selectedChat.clientName || 'Клиент'}</span>
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-semibold">Telegram</span>
                  </h2>
                  <span className="text-[10px] text-slate-400">ID: {selectedChat.externalId}</span>
                </div>
              </div>

              {/* Сообщения */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {selectedChat.messages?.map((msg: any) => {
                  const isManager = msg.senderType === 'MANAGER';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isManager ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-md p-3 rounded-2xl text-xs shadow-xs ${
                          isManager
                            ? 'bg-brand-600 text-white rounded-tr-none'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Форма ввода сообщения */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2">
                <input
                  type="text"
                  placeholder="Напишите ответ клиенту в Telegram..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-brand-500"
                />
                <button
                  type="submit"
                  disabled={sending || !messageText.trim()}
                  className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-sm"
                >
                  {sending ? '...' : 'Отправить ✈️'}
                </button>
              </form>
            </>
          ) : (
            <div className="m-auto text-center text-xs text-slate-400">Выберите диалог слева</div>
          )}
        </div>
      </div>
    </div>
  );
}
