import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  CalendarDaysIcon, 
  InboxIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { ROUTES, PAGE_TITLES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

const navigationItems = [
  {
    name: PAGE_TITLES[ROUTES.DAY],
    href: ROUTES.DAY,
    icon: CalendarDaysIcon,
  },
  {
    name: PAGE_TITLES[ROUTES.INBOX],
    href: ROUTES.INBOX,
    icon: InboxIcon,
  },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const currentPageTitle = PAGE_TITLES[location.pathname] || 'SHIFT MASH';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-red-600">
                  SHIFT MASH
                </h1>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  {navigationItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={cn(
                          'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-red-50 text-red-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        )}
                      >
                        <item.icon className="w-4 h-4 shrink-0 inline-block mr-1" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* ユーザー情報（仮） */}
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6">
                <span className="text-sm text-gray-700">北浦和店 管理者</span>
              </div>
            </div>
            
            {/* モバイルメニューボタン */}
            <div className="md:hidden">
              <button
                type="button"
                className="bg-gray-200 inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
                aria-expanded="false"
              >
                <span className="sr-only">メインメニューを開く</span>
                <Bars3Icon className="block h-6 w-6 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {currentPageTitle}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {new Date().toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </p>
          </div>
          {children}
        </div>
      </main>

      {/* モバイルナビゲーション */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex flex-col items-center py-2 px-3 rounded-lg transition-colors',
                  isActive
                    ? 'text-red-600 bg-red-50'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <item.icon className="w-6 h-6 shrink-0 mb-1" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* モバイル用のパディング */}
      <div className="md:hidden h-20" />
    </div>
  );
}
