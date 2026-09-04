import type { CheckinRecord } from '../lib/types';

interface Props {
  records: CheckinRecord[];
  weeks?: number;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function VisitCalendar({ records, weeks = 26 }: Props) {
  const counts = new Map<string, number>();
  for (const r of records) {
    const key = dateKey(new Date(r.checkedInAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const max = Math.max(1, ...counts.values());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalDays = weeks * 7;
  const start = new Date(today);
  start.setDate(start.getDate() - (totalDays - 1) - today.getDay());

  const days: { date: Date; count: number }[] = [];
  for (let i = 0; i < totalDays + 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d > today) break;
    days.push({ date: d, count: counts.get(dateKey(d)) ?? 0 });
  }

  const columns: { date: Date; count: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    columns.push(days.slice(i, i + 7));
  }

  const opacityFor = (count: number) => {
    if (count === 0) return 0;
    return 0.3 + 0.7 * Math.min(1, count / max);
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {columns.map((col, i) => (
          <div key={i} className="flex flex-col gap-1">
            {col.map((day, j) => (
              <div
                key={j}
                title={`${day.date.toLocaleDateString('ja-JP')}：${day.count}件`}
                className="h-3 w-3 rounded-sm"
                style={{
                  background: day.count > 0 ? 'var(--color-accent)' : 'var(--color-surface-2)',
                  opacity: day.count > 0 ? opacityFor(day.count) : 1,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
