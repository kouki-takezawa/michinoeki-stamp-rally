import type { CheckinTag } from '../lib/types';

const TAGS: { key: CheckinTag; label: string; emoji: string }[] = [
  { key: 'rest', label: '休憩', emoji: '☕' },
  { key: 'meal', label: '食事', emoji: '🍚' },
  { key: 'onsen', label: '温泉', emoji: '♨️' },
  { key: 'souvenir', label: 'お土産', emoji: '🎁' },
];

interface Props {
  value?: CheckinTag;
  onChange: (tag: CheckinTag) => void;
}

export function TagPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {TAGS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          aria-pressed={value === t.key}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
            value === t.key
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-border bg-surface text-ink-muted'
          }`}
        >
          <span aria-hidden="true">{t.emoji}</span> {t.label}
        </button>
      ))}
    </div>
  );
}
