'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Calendar, 
  Kanban, 
  MapPin, 
  MessageSquare, 
  Users, 
  UserCheck, 
  Package, 
  CircleDollarSign, 
  Calculator, 
  Percent, 
  CheckSquare, 
  Settings, 
  ExternalLink, 
  LogOut 
} from 'lucide-react';

const navigationGroups = [
  {
    title: 'Операции',
    items: [
      { name: 'Журнал', href: '/schedule', icon: Calendar },
      { name: 'Канбан', href: '/kanban', icon: Kanban },
      { name: 'Карта', href: '/map', icon: MapPin },
      { name: 'Бронирование', href: '/booking', icon: ExternalLink },
    ],
  },
  {
    title: 'Связь',
    items: [
      { name: 'Чаты', href: '/chat', icon: MessageSquare },
    ],
  },
  {
    title: 'Люди',
    items: [
      { name: 'Клиенты', href: '/clients', icon: Users },
      { name: 'Клинеры', href: '/cleaners', icon: UserCheck },
    ],
  },
  {
    title: 'Бизнес и склад',
    items: [
      { name: 'Склад', href: '/inventory', icon: Package },
      { name: 'Финансы', href: '/finance', icon: CircleDollarSign },
      { name: 'Калькулятор', href: '/calculator', icon: Calculator },
      { name: 'Скидки', href: '/discounts', icon: Percent },
      { name: 'Чек-листы', href: '/checklists', icon: CheckSquare },
    ],
  },
  {
    title: 'Система',
    items: [
      { name: 'Настройки', href: '/settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 select-none">
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
                const Icon = item.icon;
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
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
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
            // логика выхода
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Выход</span>
        </button>
      </div>
    </aside>
  );
}
