'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigationGroups = [
  {
    title: 'Операции',
    items: [
      { name: 'Журнал', href: '/schedule', icon: '📅' },
      { name: 'Канбан', href: '/kanban', icon: '📋' },
      { name: 'Карта', href: '/map', icon: '📍' },
      { name: 'Бронирование', href: '/book', icon: '🌐' },
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
      { name: 'Финансы', href: '/finances', icon: '💰' },
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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 select-none shrink-0">
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
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          <span className="text-base leading-none">🚪</span>
          <span>Выход</span>
        </button>
      </div>
    </aside>
  );
}
