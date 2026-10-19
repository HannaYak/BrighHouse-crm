import type { Metadata, Viewport } from 'next';
import Sidebar from '@/components/Sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'BrightHouse CRM',
  description: 'Клининговая CRM-система BrightHouse Warszawa',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg-slate-50 text-slate-900 flex flex-col md:flex-row h-screen overflow-hidden">
        {/* Боковая панель для ПК + мобильная шапка, нижний таб-бар и шторка для телефона */}
        <Sidebar />

        {/* Основной контент: адаптивные отступы, с запасом снизу под мобильный таб-бар */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8 pb-24 md:pb-8 min-w-0">
          {children}
        </main>
      </body>
    </html>
  );
}
