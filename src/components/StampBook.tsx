interface Row {
  prefecture: string;
  total: number;
  done: number;
}

interface Props {
  rows: Row[];
}

export function StampBook({ rows }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {rows.map((r) => {
        const complete = r.done >= r.total && r.total > 0;
        const started = r.done > 0;
        return (
          <div
            key={r.prefecture}
            title={`${r.prefecture} ${r.done}/${r.total}`}
            className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-center text-[10px] font-bold leading-tight ${
              complete
                ? 'border-accent bg-accent-soft text-accent'
                : started
                  ? 'border-accent/50 bg-surface text-ink'
                  : 'border-border bg-surface-2 text-ink-faint'
            }`}
          >
            <span aria-hidden="true" className="mb-0.5 text-base">
              {complete ? '⭐' : started ? '🔸' : '・'}
            </span>
            {r.prefecture.replace(/[都道府県]$/, '')}
          </div>
        );
      })}
    </div>
  );
}
