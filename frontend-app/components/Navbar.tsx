"use client";
import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  // Не показываем меню на страницах входа и публичного бронирования
  const isPublicPage = pathname?.startsWith('/login') || pathname?.startsWith('/book');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

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

        {/* Меню навигации со всеми твоими разделами */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto">
          <Link href="/schedule" className="px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
            📅 Журнал
          </Link>
          <Link href="/kanban" className="px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
            📋 Канбан
          </Link>
          <Link href="/map" className="px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
            🗺️ Карта
          </Link>
          <Link href="/calculator" className="px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
            🧮 Калькулятор
          </Link>
          <Link href="/chats" className="px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
            💬 Чат
          </Link>
          <Link href="/clients" className="px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
            👥 Клиенты
          </Link>
          <Link href="/cleaners" className="px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
            🧹 Клинеры
          </Link>
          <Link href="/discounts" className="px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
            🏷 Скидки
          </Link>
          <Link href="/checklists" className="px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
            ✅ Чек-листы
          </Link>
          <Link href="/inventory" className="px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
            📦 Склад
          </Link>
          <Link href="/finances" className="px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
            📊 Финансы
          </Link>
          <Link href="/settings" className="px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
            ⚙️ Настройки
          </Link>
        </nav>

        {/* Правый блок: кнопка на сайт + выход */}
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
            className="text-xs font-bold text-slate-500 hover:text-rose-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition flex items-center gap-1"
            title="Выйти из системы"
          >
            🚪 Выход
          </button>
        </div>
      </div>
    </header>
  );
}
