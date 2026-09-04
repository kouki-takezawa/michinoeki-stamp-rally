interface Props {
  emoji: string;
  title: string;
  hint?: string;
}

export function EmptyState({ emoji, title, hint }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-surface-2 px-4 py-10 text-center">
      <span className="text-4xl" aria-hidden="true">
        {emoji}
      </span>
      <p className="text-sm font-bold text-ink-muted">{title}</p>
      {hint && <p className="max-w-xs text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}
