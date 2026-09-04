import { useTheme } from '../lib/ThemeContext';

const LABEL: Record<string, string> = {
  system: '端末設定',
  light: 'ライト',
  dark: 'ダーク',
};

const ICON: Record<string, string> = {
  system: '🌗',
  light: '☀️',
  dark: '🌙',
};

interface Props {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: Props) {
  const { theme, cycleTheme } = useTheme();

  if (compact) {
    return (
      <button
        type="button"
        onClick={cycleTheme}
        aria-label={`テーマ: ${LABEL[theme]}（タップで切替）`}
        className="flex h-8 w-8 items-center justify-center rounded-full text-base text-ink-faint"
      >
        <span aria-hidden="true">{ICON[theme]}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`テーマ: ${LABEL[theme]}（クリックで切替）`}
      className="flex w-full items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-bold text-ink-muted hover:text-ink"
    >
      <span aria-hidden="true">{ICON[theme]}</span>
      {LABEL[theme]}
    </button>
  );
}
