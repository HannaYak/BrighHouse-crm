'use client';

import React, { useState, useEffect } from 'react';

interface Contact {
  id: number;
  name: string;
  phone?: string;
  telegramChatId?: string;
  role: 'client' | 'cleaner';
  district?: string;
  lastMessage?: string;
  lastTime?: string;
}

interface Message {
  id: string;
  sender: 'me' | 'them';
  text: string;
  time: string;
}

export default function ChatPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'cleaners' | 'clients'>('all');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Загрузка контактов (клинеров и клиентов)
  useEffect(() => {
    const loadContacts = async () => {
      try {
        setLoading(true);
        const [cleanersRes, ordersRes] = await Promise.all([
          fetch('/api/cleaners'),
          fetch('/api/orders'),
        ]);

        const list: Contact[] = [];

        // Клинеры
        if (cleanersRes.ok) {
          const cleanersData = await cleanersRes.json();
          cleanersData.forEach((c: any) => {
            list.push({
              id: c.id,
              name: `🙋‍♀️ ${c.name}`,
              phone: c.phone,
              telegramChatId: c.telegramChatId,
              role: 'cleaner',
              district: c.district || 'Центр',
              lastMessage: c.telegramChatId ? 'Telegram подключен' : 'Нет привязки бота',
              lastTime: 'Активен',
            });
          });
        }

        // Клиенты из последних заказов
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          const uniqueClients = new Map<string, any>();
          if (Array.isArray(ordersData)) {
            ordersData.forEach((o: any) => {
              if (o.clientPhone && !uniqueClients.has(o.clientPhone)) {
                uniqueClients.set(o.clientPhone, o);
              }
            });
          }

          uniqueClients.forEach((o: any, phone: string) => {
            list.push({
              id: o.clientId || Math.floor(Math.random() * 10000) + 500,
              name: `👤 ${o.clientName || 'Клиент'}`,
              phone: phone,
              role: 'client',
              district: o.addressLine1 || '',
              lastMessage: `Заказ #${o.orderNumber || ''}: ${o.serviceType || 'Уборка'}`,
              lastTime: new Date(o.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
            });
          });
        }

        setContacts(list);
        if (list.length > 0 && !selectedContact) {
          setSelectedContact(list[0]);
          initMockConversation(list[0]);
        }
      } catch (err) {
        console.error('Ошибка загрузки чатов:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, []);

  const initMockConversation = (contact: Contact) => {
    if (contact.role === 'cleaner') {
      setMessages([
        {
          id: '1',
          sender: 'them',
          text: `Здравствуйте! График на неделю актуален, готова к выездам.`,
          time: '09:15',
        },
      ]);
    } else {
      setMessages([
        {
          id: '1',
          sender: 'them',
          text: `Здравствуйте! Подскажите, клинеры приедут со своим пылесосом и химией?`,
          time: '11:20',
        },
        {
          id: '2',
          sender: 'me',
          text: `Добрый день! Да, конечно. Все профессиональные средства, инвентарь и пылесос мы привозим с собой.`,
          time: '11:24',
        },
      ]);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    initMockConversation(contact);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || !selectedContact) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      sender: 'me',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!customText) setInputText('');

    // Если есть telegramChatId — шлем реальное сообщение через бота
    if (selectedContact.telegramChatId) {
      try {
        setSending(true);
        await fetch('/api/telegram/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: selectedContact.telegramChatId,
            text: textToSend,
          }),
        });
      } catch (e) {
        console.error('Ошибка отправки в Telegram:', e);
      } finally {
        setSending(false);
      }
    }
  };

  const filteredContacts = contacts.filter((c) => {
    if (activeTab === 'cleaners') return c.role === 'cleaner';
    if (activeTab === 'clients') return c.role === 'client';
    return true;
  });

  // Быстрые шаблоны
  const quickTemplates = selectedContact?.role === 'cleaner'
    ? [
        'Назначен новый наряд на завтра. Подтверди выезд, пожалуйста!',
        'Уточни статус заказа: клининг завершен? Оплата получена наличными?',
        'Напоминаем: смена начинается в 10:00. Адрес и код домофона в наряде.',
      ]
    : [
        'Dzień dobry! Zespół BrightHouse potwierdza termin sprzątania na jutro 🏠✨',
        'Клинеры закончили уборку объекта! Всё ли вам понравилось по качеству?',
        '💳 Отправляем реквизиты для оплаты: BLIK или банковский перевод на счет Sp. z o.o.',
      ];

  return (
    <div className="flex h-[calc(100vh-4.5rem)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Левая колонка: Диалоги */}
      <div className="w-80 sm:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Центр сообщений</h2>
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
              Telegram / Чат
            </span>
          </div>

          {/* Фильтр табов */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1 rounded-lg transition ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Все ({contacts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cleaners')}
              className={`flex-1 py-1 rounded-lg transition ${
                activeTab === 'cleaners' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Клинеры
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('clients')}
              className={`flex-1 py-1 rounded-lg transition ${
                activeTab === 'clients' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Клиенты
            </button>
          </div>
        </div>

        {/* Список контактов */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Загрузка контактов...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">Диалогов пока нет</div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id && selectedContact?.role === contact.role;
              return (
                <div
                  key={`${contact.role}_${contact.id}`}
                  onClick={() => handleSelectContact(contact)}
                  className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${
                    isSelected ? 'bg-blue-50/80 border-r-4 border-blue-600' : 'hover:bg-slate-100/70'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    contact.role === 'cleaner' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {contact.name.slice(2, 4).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {contact.name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                        {contact.lastTime}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {contact.lastMessage}
                    </p>
                    {contact.phone && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        📞 {contact.phone}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Правая колонка: Окно переписки */}
      <div className="flex-1 flex flex-col bg-slate-50/40">
        {selectedContact ? (
          <>
            {/* Шапка чата */}
            <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                  selectedContact.role === 'cleaner' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {selectedContact.name.slice(2, 4).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    {selectedContact.name}
                    {selectedContact.telegramChatId ? (
                      <span className="bg-sky-100 text-sky-800 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                        TG Bot On
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-medium">
                        Direct / Phone
                      </span>
                    )}
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    {selectedContact.phone || 'Телефон не указан'} • {selectedContact.district || 'Варшава'}
                  </div>
                </div>
              </div>

              {selectedContact.phone && (
                <a
                  href={`tel:${selectedContact.phone}`}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition"
                >
                  📞 Позвонить
                </a>
              )}
            </div>

            {/* Сообщения */}
            <div className="flex-1 p-5 overflow-y-auto space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-md p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      msg.sender === 'me'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span
                      className={`text-[9px] block text-right mt-1 font-mono ${
                        msg.sender === 'me' ? 'text-blue-200' : 'text-slate-400'
                      }`}
                    >
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Быстрые шаблоны */}
            <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">⚡ Быстрый ответ:</span>
              {quickTemplates.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(tmpl)}
                  className="bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-medium px-2.5 py-1 rounded-lg transition whitespace-nowrap shrink-0 border border-slate-200"
                >
                  {tmpl.slice(0, 32)}...
                </button>
              ))}
            </div>

            {/* Поле ввода */}
            <div className="p-3 bg-white border-t border-slate-200 flex gap-2">
              <input
                type="text"
                placeholder={`Написать ${selectedContact.role === 'cleaner' ? 'клинеру' : 'клиенту'}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={sending || !inputText.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {sending ? '...' : 'Отправить ✈️'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            Выберите диалог из списка слева
          </div>
        )}
      </div>
    </div>
  );
}
