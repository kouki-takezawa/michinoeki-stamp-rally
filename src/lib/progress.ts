import type { CheckinRecord, Station } from './types';

export interface PrefectureRow {
  prefecture: string;
  total: number;
  done: number;
}

export function computePrefectureProgress(
  records: CheckinRecord[],
  stations: Station[],
): PrefectureRow[] {
  const totals = new Map<string, number>();
  for (const s of stations) {
    totals.set(s.prefecture, (totals.get(s.prefecture) ?? 0) + 1);
  }
  const stationById = new Map(stations.map((s) => [s.id, s]));
  const done = new Map<string, number>();
  for (const r of records) {
    const s = stationById.get(r.stationId);
    if (!s) continue;
    done.set(s.prefecture, (done.get(s.prefecture) ?? 0) + 1);
  }
  return Array.from(totals.entries())
    .map(([prefecture, total]) => ({ prefecture, total, done: done.get(prefecture) ?? 0 }))
    .sort(
      (a, b) =>
        b.done / b.total - a.done / a.total || a.prefecture.localeCompare(b.prefecture, 'ja'),
    );
}
