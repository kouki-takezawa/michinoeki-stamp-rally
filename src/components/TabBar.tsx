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

export function TabBar({ active, onChange, onOpenSettings }: Props) {
  return (
    <>
      {/* デスクトップ：左サイドバー */}
      <nav className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-border bg-surface p-4 lg:flex">
        <div className="mb-6 px-2">
          <div className="font-display text-lg font-black">道の駅ラリー</div>
        </div>
        <div className="flex flex-col gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              aria-current={active === t.key}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold ${
                active === t.key ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
              }`}
            >
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <span aria-hidden="true">⚙️</span>
            設定
          </button>
        </div>
        <div className="mt-auto pt-4">
          <ThemeToggle />
        </div>
      </nav>

      {/* モバイル：下部タブバー（高さ h-16 固定。BottomSheet等はlib/layout.tsのMOBILE_TABBAR_SPACEでこの高さぶん持ち上げる） */}
      <nav
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center border-t border-border bg-surface lg:hidden"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            aria-current={active === t.key}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-bold ${
              active === t.key ? 'text-accent' : 'text-ink-faint'
            }`}
          >
            <span className="text-lg" aria-hidden="true">
              {t.icon}
            </span>
            {t.label}
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
