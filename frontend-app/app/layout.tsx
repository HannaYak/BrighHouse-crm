import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: 'BrightHouse CRM — Панель Менеджера',
  description: 'CRM-система автоматизации клининга',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg-slate-50 text-slate-900 font-sans antialiased min-h-screen flex flex-col">
        {/* Верхняя минималистичная шапка (Notion/Linear Style) */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            {/* Логотип */}
            <div className="flex items-center space-x-3">
              <span className="text-xl">🧹</span>
              <span className="font-bold tracking-tight text-slate-800">BrightHouse <span className="text-blue-600 font-medium text-sm bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 ml-1">CRM</span></span>
            </div>

            {/* Вкладки навигации по ТЗ */}
            <nav className="flex space-x-1 h-full items-center">
              <Link 
                href="/kanban-board" 
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition-colors flex items-center gap-2"
              >
                📋 Канбан
              </Link>
              <Link 
                href="/day-map" 
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition-colors flex items-center gap-2"
              >
                🗺️ Карта дня
              </Link>
              <Link 
                href="/directories" 
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition-colors flex items-center gap-2"
              >
                🗄️ Справочники
              </Link>
            </nav>

            {/* Профиль менеджера */}
            <div className="flex items-center space-x-3 text-sm text-slate-500 border-l border-slate-200 pl-4">
              <span>Менеджер: <strong>Анна</strong></span>
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                А
              </div>
            </div>
          </div>
        </header>

        {/* Главный контент приложения */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6">
          {children}
        </main>
      </body>
    </html>
  );
}