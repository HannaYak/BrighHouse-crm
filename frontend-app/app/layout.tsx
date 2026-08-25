import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'BrightHouse CRM',
  description: 'CRM-система для клининга BrightHouse',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans antialiased">
        {/* Верхняя навигационная панель */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            {/* Логотип */}
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <span className="font-extrabold text-sm tracking-tight text-slate-900">
                Bright<span className="text-brand-600">House</span> CRM
              </span>
            </div>

            {/* Меню навигации */}
           <nav className="flex items-center gap-2">
  <Link href="/schedule" className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
    📅 Журнал
  </Link>
  <Link href="/kanban" className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
    📋 Канбан
  </Link>
  <Link href="/map" className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
    🗺️ Карта
  </Link>
  <Link href="/analytics" className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
    📈 Аналитика
  </Link>
  <Link href="/directories" className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
    👥 Справочники
  </Link>
  <Link
  href="/cleaners"
  className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition"
>
  🧹 Клинеры
</Link>
  {/* 👇 ВОТ СЮДА МОЖНО ВСТАВИТЬ КНОПКУ ЧАТОВ 👇 */}
  <Link href="/chat" className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition">
    💬 Чаты
  </Link>
  <Link
  href="/schedule"
  className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition"
>
  🗓 Календарь
</Link>           
             <Link
  href="/clients"
  className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition"
>
  👥 Клиенты
</Link>
             <Link
                href="/inventory"
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition"
              >
                📦 Склад
              </Link>
             <Link
  href="/finances"
  className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 transition"
>
  📊 Финансы
</Link>
</nav>

            {/* Статус системы */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-semibold text-slate-500">Система активна</span>
            </div>
          </div>
        </header>

        {/* Основная рабочая область */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4">
          {children}
        </main>
      </body>
    </html>
  );
}
