import { useEffect, useState } from 'react';
import { useFriendRequestBadge } from '../hooks/useFriendRequestBadge';
import { MOBILE_TABBAR_SPACE } from '../lib/layout';
import { ThemeToggle } from './ThemeToggle';

export type TabKey = 'nearby' | 'mypage' | 'friends';

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  onOpenSettings: () => void;
}

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'nearby', label: '近くの道の駅', icon: '📍' },
  { key: 'mypage', label: 'マイページ', icon: '🗺️' },
  { key: 'friends', label: '友達', icon: '👥' },
];

export const TAB_ORDER: TabKey[] = TABS.map((t) => t.key);

const COLLAPSE_KEY = 'michinoeki-sidebar-collapsed-v1';

export function TabBar({ active, onChange, onOpenSettings }: Props) {
  const friendRequestCount = useFriendRequestBadge();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', collapsed ? '4.5rem' : '14rem');
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [collapsed]);

  return (
    <>
      {/* デスクトップ：左サイドバー（折りたたみ可能。幅は--sidebar-w CSS変数で他要素と共有） */}
      <nav
        className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-w)] flex-col border-r border-border bg-surface p-4 transition-[width] duration-150 lg:flex"
      >
        <div className="mb-6 flex items-center justify-between px-2">
          {!collapsed && <div className="font-display text-lg font-black">道の駅ラリー</div>}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'サイドバーを広げる' : 'サイドバーを折りたたむ'}
            aria-label={collapsed ? 'サイドバーを広げる' : 'サイドバーを折りたたむ'}
            className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-2 hover:text-ink"
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              aria-current={active === t.key}
              title={t.label}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold ${
                active === t.key ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
              }`}
            >
              <span aria-hidden="true">{t.icon}</span>
              {!collapsed && t.label}
              {t.key === 'friends' && friendRequestCount > 0 && (
                <span className="absolute right-2 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {friendRequestCount}
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={onOpenSettings}
            title="設定"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <span aria-hidden="true">⚙️</span>
            {!collapsed && '設定'}
          </button>
        </div>
        <div className="mt-auto pt-4">
          <ThemeToggle compact={collapsed} />
        </div>
      </nav>

      {/* モバイル：下部タブバー。高さはMOBILE_TABBAR_SPACE(4rem + セーフエリア)で、
          paddingBottomでセーフエリア分だけ中身を上に逃がす（heightを固定したままpaddingを足すと
          ホーム画面追加時など実機でセーフエリアが非ゼロになった時にコンテンツが潰れるため、高さ自体を可変にする） */}
      <nav
        style={{ height: MOBILE_TABBAR_SPACE, paddingBottom: 'env(safe-area-inset-bottom)' }}
        className="fixed inset-x-0 bottom-0 z-30 flex items-center border-t border-border bg-surface lg:hidden"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            aria-current={active === t.key}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-bold ${
              active === t.key ? 'text-accent' : 'text-ink-faint'
            }`}
          >
            <span className="text-lg" aria-hidden="true">
              {t.icon}
            </span>
            {t.label}
            {t.key === 'friends' && friendRequestCount > 0 && (
              <span className="absolute right-[22%] top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {friendRequestCount}
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-bold text-ink-faint"
        >
          <span className="text-lg" aria-hidden="true">
            ⚙️
          </span>
          設定
        </button>
        <div className="pr-3">
          <ThemeToggle compact />
        </div>
      </nav>
    </>
  );
}
