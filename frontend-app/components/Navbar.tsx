"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Не показываем меню на страницах входа и публичного бронирования
  const isPublicPage = pathname?.startsWith('/login') || pathname?.startsWith('/book');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { href: '/schedule', label: '📅 Журнал' },
    { href: '/kanban', label: '📋 Канбан' },
    { href: '/map', label: '🗺️ Карта' },
    { href: '/calculator', label: '🧮 Калькулятор' },
    { href: '/chats', label: '💬 Чат' },
    { href: '/clients', label: '👥 Клиенты' },
    { href: '/cleaners', label: '🧹 Клинеры' },
    { href: '/discounts', label: '🏷 Скидки' },
    { href: '/checklists', label: '✅ Чек-листы' },
    { href: '/inventory', label: '📦 Склад' },
    { href: '/finances', label: '📊 Финансы' },
    { href: '/settings', label: '⚙️ Настройки' },
  ];

  if (isPublicPage) return null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        
        {/* Логотип */}
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <Link href="/" className="font-extrabold text-sm tracking-tight text-slate-900">
            Bright<span className="text-brand-600">House</span> CRM
          </Link>
        </div>

        {/* Меню навигации для Desktop (экраны от 1024px) */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition ${
                pathname === link.href
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Правый блок: кнопка на сайт + выход + кнопка мобильного меню */}
        <div className="flex items-center gap-2">
          <Link
            href="/book"
            target="_blank"
            className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition hidden sm:inline-block"
          >
            🌐 Форма бронирования
          </Link>

          <button
            onClick={handleLogout}
            className="text-xs font-bold text-slate-500 hover:text-rose-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition hidden sm:flex items-center gap-1"
            title="Выйти из системы"
          >
            🚪 Выход
          </button>

          {/* Гамбургер для мобильных экранов */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            aria-label="Меню"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Мобильная выпадающая шторка */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 shadow-lg">
          <div className="grid grid-cols-2 gap-1.5 pb-2 border-b border-slate-100">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition ${
                  pathname === link.href
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <Link
              href="/book"
              target="_blank"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg"
            >
              🌐 Форма бронирования
            </Link>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-2 rounded-lg"
            >
              🚪 Выйти
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
