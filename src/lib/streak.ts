import type { CheckinRecord } from './types';

function toDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function daysAgoKey(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function computeStreak(records: CheckinRecord[]): number {
  if (records.length === 0) return 0;
  const dateKeys = new Set(records.map((r) => toDateKey(r.checkedInAt)));

  let streak = 0;
  let offset = 0;
  if (!dateKeys.has(daysAgoKey(0))) {
    if (!dateKeys.has(daysAgoKey(1))) return 0;
    offset = 1;
  }
  while (dateKeys.has(daysAgoKey(offset))) {
    streak += 1;
    offset += 1;
  }
  return streak;
}

export function maxCheckinsInOneDay(records: CheckinRecord[]): number {
  const counts = new Map<string, number>();
  for (const r of records) {
    const key = toDateKey(r.checkedInAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Math.max(0, ...counts.values());
}
