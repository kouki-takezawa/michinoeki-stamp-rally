import type { ReactNode } from 'react';
import { useAuth } from '../lib/AuthContext';

export type Page = 'dashboard' | 'users' | 'audit-log';

interface LayoutProps {
  page: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

const NAV: { key: Page; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'users', label: 'ユーザー管理' },
  { key: 'audit-log', label: '操作ログ' },
];

export function Layout({ page, onNavigate, children }: LayoutProps) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold text-stone-800">道の駅ラリー管理画面</span>
          <nav className="flex gap-1">
            {NAV.map((item) => (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  page === item.key
                    ? 'bg-emerald-700 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-stone-500 sm:inline">{user?.email}</span>
          <button
            onClick={() => void signOut()}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600"
          >
            ログアウト
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
