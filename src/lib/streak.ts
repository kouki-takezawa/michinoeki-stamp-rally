import type { CheckinRecord } from './types';

function toDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayAtOffset(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d;
}

function daysAgoKey(days: number): string {
  const d = dayAtOffset(days);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

// G02: 月1回まで、その日にチェックインがなくても連続記録が途切れない「ストリーク凍結」を許容する
export function computeStreak(records: CheckinRecord[]): number {
  if (records.length === 0) return 0;
  const dateKeys = new Set(records.map((r) => toDateKey(r.checkedInAt)));

  let offset = 0;
  if (!dateKeys.has(daysAgoKey(0))) {
    if (!dateKeys.has(daysAgoKey(1))) return 0;
    offset = 1;
  }

  let streak = 0;
  const usedFreezeMonths = new Set<string>();
  // 無限ループ防止のため直近5年分までとする
  for (let guard = 0; guard < 365 * 5; guard++) {
    const day = dayAtOffset(offset);
    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
    if (dateKeys.has(key)) {
      streak += 1;
      offset += 1;
      continue;
    }
    const monthKey = monthKeyOf(day);
    if (!usedFreezeMonths.has(monthKey)) {
      usedFreezeMonths.add(monthKey);
      offset += 1;
      continue;
    }
    break;
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
