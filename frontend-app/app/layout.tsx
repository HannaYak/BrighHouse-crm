import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'BrightHouse CRM',
  description: 'Панель управления клинингом',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen flex flex-col font-sans">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xl">✨</span>
              <span className="font-bold tracking-tight text-slate-800">
                BrightHouse <span className="text-brand-600 font-semibold text-xs bg-brand-50 border border-brand-100 px-2 py-0.5 rounded">CRM</span>
              </span>
            </div>

            <nav className="flex items-center space-x-1">
              <Link href="/kanban" className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-100 rounded-md transition-colors">
                Канбан
              </Link>
              <Link href="/map" className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-100 rounded-md transition-colors">
                Карта дня
              </Link>
              <Link href="/clients" className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-100 rounded-md transition-colors">
                Клиенты
              </Link>
              <Link href="/cleaners" className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-100 rounded-md transition-colors">
                Клинеры
              </Link>
              <Link href="/directories" className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-100 rounded-md transition-colors">
                Справочники
              </Link>
            </nav>

            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
              <span>Admin</span>
              <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center">
                A
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
