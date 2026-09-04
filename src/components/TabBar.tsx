import { ThemeToggle } from './ThemeToggle';

export type TabKey = 'nearby' | 'mypage';

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'nearby', label: '近くの道の駅' },
  { key: 'mypage', label: 'マイページ' },
];

export function TabBar({ active, onChange }: Props) {
  return (
    <nav className="sticky top-0 z-10 flex justify-center border-b border-border bg-surface">
      <div className="flex w-full max-w-xl items-center px-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`flex-1 border-b-2 px-4 py-3 text-sm font-bold ${
              active === t.key
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="shrink-0 py-2">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
