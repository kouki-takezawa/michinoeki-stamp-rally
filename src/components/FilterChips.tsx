interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface Props {
  chips: Chip[];
  onClearAll: () => void;
}

export function FilterChips({ chips, onClearAll }: Props) {
  if (chips.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="flex items-center gap-1 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent"
        >
          {chip.label}
          <span aria-hidden="true">×</span>
        </button>
      ))}
      {chips.length > 1 && (
        <button type="button" onClick={onClearAll} className="text-xs text-ink-faint underline">
          すべてクリア
        </button>
      )}
    </div>
  );
}
