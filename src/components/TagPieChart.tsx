import type { CheckinTag } from '../lib/types';

const TAG_META: Record<CheckinTag, { label: string; color: string }> = {
  rest: { label: '休憩', color: '#3d5a73' },
  meal: { label: '食事', color: '#ba5326' },
  onsen: { label: '温泉', color: '#137988' },
  souvenir: { label: 'お土産', color: '#a1650e' },
};

interface Props {
  tags: (CheckinTag | undefined)[];
}

export function TagPieChart({ tags }: Props) {
  const counts = new Map<CheckinTag, number>();
  let untagged = 0;
  for (const t of tags) {
    if (!t) {
      untagged++;
      continue;
    }
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const total = tags.length;
  if (total === 0) return null;

  const entries = (Object.keys(TAG_META) as CheckinTag[])
    .map((t) => ({ tag: t, count: counts.get(t) ?? 0, ...TAG_META[t] }))
    .filter((e) => e.count > 0);

  let cursor = 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0 -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--color-surface-2)" strokeWidth="18" />
        {entries.map((e) => {
          const fraction = e.count / total;
          const dash = fraction * circumference;
          const el = (
            <circle
              key={e.tag}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={e.color}
              strokeWidth="18"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-cursor}
            />
          );
          cursor += dash;
          return el;
        })}
      </svg>
      <div className="space-y-1 text-xs">
        {entries.map((e) => (
          <div key={e.tag} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
            <span className="font-bold">{e.label}</span>
            <span className="text-ink-faint">
              {e.count}件（{Math.round((e.count / total) * 100)}%）
            </span>
          </div>
        ))}
        {untagged > 0 && <div className="text-ink-faint">未分類 {untagged}件</div>}
      </div>
    </div>
  );
}
