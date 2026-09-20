'use client';

import React, { useState, useEffect } from 'react';
import OrderModal, { OrderDetail } from '../../components/OrderModal';

export type PlatformType = 'TELEGRAM' | 'WHATSAPP' | 'INSTAGRAM' | 'FACEBOOK';

interface ChatContact {
  id: string; // ID диалога из БД Conversation или внешний ID
  name: string;
  phone?: string;
  platform: PlatformType;
  role: 'client' | 'cleaner';
  district?: string;
  lastMessage?: string;
  lastTime?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  sender: 'me' | 'them';
  text: string;
  time: string;
}

const PLATFORM_CONFIG: Record<PlatformType, { label: string; icon: string; badgeClass: string }> = {
  TELEGRAM: { label: 'Telegram', icon: '✈️', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' },
  WHATSAPP: { label: 'WhatsApp', icon: '💬', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  INSTAGRAM: { label: 'Instagram', icon: '📸', badgeClass: 'bg-pink-50 text-pink-700 border-pink-200' },
  FACEBOOK: { label: 'Facebook', icon: '📘', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
};

export default function ChatPage() {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [activePlatformFilter, setActivePlatformFilter] = useState<'ALL' | PlatformType>('ALL');
  const [activeRoleFilter, setActiveRoleFilter] = useState<'ALL' | 'cleaners' | 'clients'>('ALL');
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Для создания заказа сразу из чата
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderFromChat, setOrderFromChat] = useState<OrderDetail | null>(null);

  // Загрузка диалогов со всех платформ
  const loadConversations = async () => {
    try {
      setLoading(true);
      const [convRes, cleanersRes] = await Promise.all([
        fetch('/api/chat/conversations'),
        fetch('/api/cleaners'),
      ]);

      const list: ChatContact[] = [];

      // 1. Диалоги клиентов из базы Conversation (Telegram, WhatsApp, Instagram, Facebook)
      if (convRes.ok) {
        const convData = await convRes.json();
        if (Array.isArray(convData)) {
          convData.forEach((c: any) => {
            const platformKey = (c.channel || 'TELEGRAM').toUpperCase() as PlatformType;
            const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
            list.push({
              id: c.id,
              name: c.clientName || 'Клиент',
              phone: c.phone || '',
              platform: PLATFORM_CONFIG[platformKey] ? platformKey : 'TELEGRAM',
              role: 'client',
              district: c.address || 'Варшава',
              lastMessage: lastMsg ? lastMsg.text : 'Новый диалог',
              lastTime: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Сейчас',
            });
          });
        }
      }

      // 2. Внутренние чаты с нашими клинерами через Telegram-бот бригады
      if (cleanersRes.ok) {
        const cleanersData = await cleanersRes.json();
        if (Array.isArray(cleanersData)) {
          cleanersData.forEach((cl: any) => {
            list.push({
              id: `cleaner_${cl.id}`,
              name: `🙋‍♀️ ${cl.name}`,
              phone: cl.phone,
              platform: 'TELEGRAM',
              role: 'cleaner',
              district: cl.district || 'Центр',
              lastMessage: cl.telegramChatId ? 'Telegram подключен' : 'Ожидает PIN',
              lastTime: 'Смена',
            });
          });
        }
      }

      setContacts(list);
      if (list.length > 0 && !selectedContact) {
        setSelectedContact(list[0]);
        loadMessages(list[0]);
      }
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const loadMessages = async (contact: ChatContact) => {
    if (contact.role === 'cleaner') {
      setMessages([
        {
          id: '1',
          sender: 'them',
          text: `Здравствуйте! График актуален, готова к выездам.`,
          time: '09:15',
        },
      ]);
      return;
    }

    try {
      const res = await fetch(`/api/chat/messages?conversationId=${contact.id}`);
      if (res.ok) {
        const data = await res.json();
        const formatted: Message[] = (data || []).map((m: any) => ({
          id: m.id,
          sender: m.senderType === 'CLIENT' ? 'them' : 'me',
          text: m.text,
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setMessages(formatted.length > 0 ? formatted : [
          {
            id: 'init_1',
            sender: 'them',
            text: 'Здравствуйте! Подскажите стоимость уборки квартиры 50 м² в Варшаве?',
            time: '12:00',
          }
        ]);
      } else {
        setMessages([
          {
            id: 'init_1',
            sender: 'them',
            text: 'Dzień dobry! Chciałbym zamówić sprzątanie mieszkania.',
            time: '11:40',
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectContact = (contact: ChatContact) => {
    setSelectedContact(contact);
    loadMessages(contact);
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

    try {
      setSending(true);
      await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedContact.id,
          platform: selectedContact.platform,
          phone: selectedContact.phone,
          text: textToSend,
        }),
      });
    } catch (e) {
      console.error('Ошибка отправки ответа:', e);
    } finally {
      setSending(false);
    }
  };

  // Открытие модалки создания заказа с предзаполненными данными из чата
  const handleCreateOrderFromChat = () => {
    if (!selectedContact) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    setOrderFromChat({
      date: todayStr,
      startTime: '10:00',
      endTime: '13:30',
      timeSlot: '10:00 — 13:30',
      serviceType: 'STANDARD',
      areaM2: 45,
      roomsCount: 2,
      bathroomsCount: 1,
      windowsCount: 0,
      balconyWindowsCount: 0,
      showcaseWindowsCount: 0,
      hasOven: false,
      hasFridge: false,
      hasFridgeFreeze: false,
      hasMicrowave: false,
      hasBalcony: false,
      hasKitchenClosets: false,
      hasStairs: false,
      hasSteamer: false,
      hasDishesHours: 0,
      hasIroningHours: 0,
      hasVacuum: false,
      hasPets: false,
      hasKeys: false,
      drySofa2: 0,
      drySofa3: 0,
      drySofaCorner4: 0,
      dryArmchair: 0,
      dryMattressSide: 0,
      price: 200,
      cleanersCount: 1,
      clientName: selectedContact.name.replace('👤 ', '').replace('🙋‍♀️ ', ''),
      clientPhone: selectedContact.phone || '',
      addressLine1: selectedContact.district !== 'Варшава' ? selectedContact.district || '' : '',
      assignedCleaners: [],
      status: 'NEW',
      notes: `Заявка получена из канала: ${selectedContact.platform}`,
      paymentMethod: 'CASH',
    });
    setIsOrderModalOpen(true);
  };

  const filteredContacts = contacts.filter((c) => {
    if (activePlatformFilter !== 'ALL' && c.platform !== activePlatformFilter) return false;
    if (activeRoleFilter === 'cleaners' && c.role !== 'cleaner') return false;
    if (activeRoleFilter === 'clients' && c.role !== 'client') return false;
    return true;
  });

  const quickTemplates = selectedContact?.role === 'cleaner'
    ? [
        'Назначен новый наряд на завтра. Подтверди выезд, пожалуйста!',
        'Уточни статус заказа: клининг завершен? Оплата получена наличными?',
        'Напоминаем: смена начинается в 10:00. Код домофона в наряде.',
      ]
    : [
        'Dzień dobry! Zespół BrightHouse potwierdza termin sprzątania na jutro 🏠✨',
        'Клинеры закончили уборку! Всё ли вам понравилось по качеству?',
        '💳 Реквизиты для оплаты: счет Sp. z o.o. или перевод BLIK на номер фирмы.',
        'Прайс: 1-комн. (до 34м²) — 170 zł, 2-комн. (до 50м²) — 200 zł. Приезжаем со своей химией и инвентарем!',
      ];

  return (
    <div className="flex h-[calc(100vh-4.5rem)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Левая колонка: Диалоги */}
      <div className="w-80 sm:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Омниканальные чаты</h2>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full font-bold">
              Все каналы
            </span>
          </div>

          {/* Фильтр по платформам: Все, TG, WA, IG, FB */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-[11px] font-bold gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActivePlatformFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                activePlatformFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Все ({contacts.length})
            </button>
            <button
              type="button"
              onClick={() => setActivePlatformFilter('TELEGRAM')}
              className={`px-2 py-1 rounded-lg transition shrink-0 flex items-center gap-1 ${
                activePlatformFilter === 'TELEGRAM' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-600 hover:text-sky-600'
              }`}
            >
              ✈️ TG
            </button>
            <button
              type="button"
              onClick={() => setActivePlatformFilter('WHATSAPP')}
              className={`px-2 py-1 rounded-lg transition shrink-0 flex items-center gap-1 ${
                activePlatformFilter === 'WHATSAPP' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-600'
              }`}
            >
              💬 WA
            </button>
            <button
              type="button"
              onClick={() => setActivePlatformFilter('INSTAGRAM')}
              className={`px-2 py-1 rounded-lg transition shrink-0 flex items-center gap-1 ${
                activePlatformFilter === 'INSTAGRAM' ? 'bg-pink-600 text-white shadow-xs' : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              📸 IG
            </button>
            <button
              type="button"
              onClick={() => setActivePlatformFilter('FACEBOOK')}
              className={`px-2 py-1 rounded-lg transition shrink-0 flex items-center gap-1 ${
                activePlatformFilter === 'FACEBOOK' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              📘 FB
            </button>
          </div>

          {/* Фильтр роли: Клиенты / Клинеры */}
          <div className="flex bg-slate-200/60 p-0.5 rounded-lg text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setActiveRoleFilter('ALL')}
              className={`flex-1 py-1 rounded-md transition ${activeRoleFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              Все
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleFilter('clients')}
              className={`flex-1 py-1 rounded-md transition ${activeRoleFilter === 'clients' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'}`}
            >
              Клиенты
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleFilter('cleaners')}
              className={`flex-1 py-1 rounded-md transition ${activeRoleFilter === 'cleaners' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500'}`}
            >
              Бригада
            </button>
          </div>
        </div>

        {/* Список диалогов */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Загрузка диалогов...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">Диалогов пока нет</div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              const platformCfg = PLATFORM_CONFIG[contact.platform];

              return (
                <div
                  key={contact.id}
                  onClick={() => handleSelectContact(contact)}
                  className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${
                    isSelected ? 'bg-blue-50/80 border-r-4 border-blue-600' : 'hover:bg-slate-100/70'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    contact.role === 'cleaner' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {contact.name.slice(0, 2).toUpperCase()}
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

                    <p className="text-[11px] text-slate-500 truncate mb-1">
                      {contact.lastMessage}
                    </p>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${platformCfg.badgeClass}`}>
                        {platformCfg.icon} {platformCfg.label}
                      </span>
                      {contact.phone && (
                        <span className="text-[10px] text-slate-400 font-mono truncate">
                          {contact.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Правая колонка: Окно активного чата */}
      <div className="flex-1 flex flex-col bg-slate-50/40">
        {selectedContact ? (
          <>
            {/* Шапка чата */}
            <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                  selectedContact.role === 'cleaner' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {selectedContact.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    {selectedContact.name}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${PLATFORM_CONFIG[selectedContact.platform].badgeClass}`}>
                      {PLATFORM_CONFIG[selectedContact.platform].icon} {PLATFORM_CONFIG[selectedContact.platform].label}
                    </span>
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    {selectedContact.phone || 'Без телефона'} • {selectedContact.district || 'Варшава'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedContact.role === 'client' && (
                  <button
                    type="button"
                    onClick={handleCreateOrderFromChat}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    📝 Оформить заказ
                  </button>
                )}
                {selectedContact.phone && (
                  <a
                    href={`tel:${selectedContact.phone}`}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition"
                  >
                    📞 Позвонить
                  </a>
                )}
              </div>
            </div>

            {/* Лента сообщений */}
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
                  {tmpl.slice(0, 35)}...
                </button>
              ))}
            </div>

            {/* Поле ввода */}
            <div className="p-3 bg-white border-t border-slate-200 flex gap-2">
              <input
                type="text"
                placeholder={`Ответить в ${PLATFORM_CONFIG[selectedContact.platform].label}...`}
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
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
              >
                {sending ? '...' : `Отправить в ${PLATFORM_CONFIG[selectedContact.platform].label}`}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            Выберите диалог из списка слева
          </div>
        )}
      </div>

      {/* Модалка оформления заказа прямо из чата */}
      {isOrderModalOpen && (
        <OrderModal
          order={orderFromChat}
          isOpen={isOrderModalOpen}
          onClose={() => {
            setIsOrderModalOpen(false);
            setOrderFromChat(null);
          }}
          onSave={async (saved) => {
            await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(saved),
            });
            setIsOrderModalOpen(false);
            setOrderFromChat(null);
            alert('✅ Заказ из переписки успешно создан и отправлен на Канбан!');
          }}
        />
      )}
    </div>
  );
}
