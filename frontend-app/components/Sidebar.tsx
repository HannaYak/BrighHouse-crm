'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigationGroups = [
  {
    title: 'Операции',
    items: [
      { name: 'Журнал', href: '/', icon: '📑' },
      { name: 'Расписание', href: '/schedule', icon: '📅' },
      { name: 'Канбан', href: '/kanban', icon: '📋' },
      { name: 'Карта', href: '/map', icon: '📍' },
    ],
  },
  {
    title: 'Связь',
    items: [
      { name: 'Чаты', href: '/chat', icon: '💬' },
    ],
  },
  {
    title: 'Люди',
    items: [
      { name: 'Клиенты', href: '/clients', icon: '👥' },
      { name: 'Клинеры', href: '/cleaners', icon: '🧹' },
    ],
  },
  {
    title: 'Бизнес и склад',
    items: [
      { name: 'Склад', href: '/inventory', icon: '📦' },
      { name: 'Финансы', href: '/finance', icon: '💰' },
      { name: 'Калькулятор', href: '/calculator', icon: '🧮' },
      { name: 'Скидки', href: '/discounts', icon: '🏷️' },
      { name: 'Чек-листы', href: '/checklists', icon: '✅' },
    ],
  },
  {
    title: 'Система',
    items: [
      { name: 'Настройки', href: '/settings', icon: '⚙️' },
    ],
  },
];

const mobileBottomTabs = [
  { name: 'Журнал', href: '/', icon: '📑' },
  { name: 'График', href: '/schedule', icon: '📅' },
  { name: 'Канбан', href: '/kanban', icon: '📋' },
  { name: 'Чаты', href: '/chat', icon: '💬' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeDrawer = () => setIsMobileMenuOpen(false);

  return (
    <>
      {/* =========================================
          1. МОБИЛЬНАЯ ВЕРХНЯЯ ШАПКА (только < md)
      ========================================= */}
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-3.5 py-2 safe-p-top flex items-center justify-between shrink-0 shadow-2xs">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-base font-extrabold tracking-tight text-slate-900">
            BrightHouse <span className="text-blue-600">CRM</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Быстрая кнопка перехода в WhatsApp Business */}
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-2xs"
            title="Открыть приложение WhatsApp"
          >
            <span>💬</span>
            <span className="text-[11px]">WhatsApp</span>
          </a>

          {/* Кнопка бургер-меню */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            aria-label="Открыть меню"
          >
            <span className="text-lg leading-none">☰</span>
          </button>
        </div>
      </header>

      {/* =========================================
          2. ДЕСКТОПНЫЙ SIDEBAR (только >= md)
      ========================================= */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col h-screen sticky top-0 select-none shrink-0">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-slate-900">
            BrightHouse <span className="text-blue-600">CRM</span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navigationGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="text-base leading-none">{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => {
              window.location.href = '/login';
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
          >
            <span className="text-base leading-none">🚪</span>
            <span>Выход</span>
          </button>
        </div>
      </aside>

      {/* =========================================
          3. МОБИЛЬНАЯ НИЖНЯЯ ПАНЕЛЬ НАВИГАЦИИ (< md)
      ========================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 safe-p-bottom flex items-center justify-around shadow-lg">
        {mobileBottomTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <span className="text-lg leading-none mb-0.5">{tab.icon}</span>
              <span className="text-[10px] leading-tight">{tab.name}</span>
            </Link>
          );
        })}

        {/* Кнопка "Еще" в нижнем меню */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            isMobileMenuOpen ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <span className="text-lg leading-none mb-0.5">☰</span>
          <span className="text-[10px] leading-tight">Еще</span>
        </button>
      </nav>

      {/* =========================================
          4. МОБИЛЬНОЕ ВЫДВИЖНОЕ МЕНЮ (ШТОРКА / DRAWER)
      ========================================= */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Затемнение фона */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={closeDrawer}
          />

          {/* Сама панель */}
          <div className="relative ml-auto w-72 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col z-10 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="font-bold text-slate-800 text-sm">
                BrightHouse <span className="text-blue-600">Меню</span>
              </span>
              <button
                type="button"
                onClick={closeDrawer}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {navigationGroups.map((group) => (
                <div key={group.title}>
                  <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {group.title}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={closeDrawer}
                          className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                            isActive
                              ? 'bg-blue-50 text-blue-600 font-bold'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <span className="text-base leading-none">{item.icon}</span>
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/login';
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-red-600 rounded-xl hover:bg-red-50 transition cursor-pointer"
              >
                <span className="text-base leading-none">🚪</span>
                <span>Выход</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
