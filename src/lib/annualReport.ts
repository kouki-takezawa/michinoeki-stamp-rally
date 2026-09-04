import type { CheckinRecord, Station } from './types';

export interface AnnualReport {
  year: number;
  count: number;
  prefectureCount: number;
  topPrefecture: string | null;
  topMonth: number | null;
}

// F03: サーバー不要のローカル集計による簡易年間レポート
export function buildAnnualReport(
  checkedStations: (Station & CheckinRecord)[],
  year = new Date().getFullYear(),
): AnnualReport {
  const yearRecords = checkedStations.filter((s) => new Date(s.checkedInAt).getFullYear() === year);

  const prefectureCounts = new Map<string, number>();
  const monthCounts = new Map<number, number>();
  for (const r of yearRecords) {
    prefectureCounts.set(r.prefecture, (prefectureCounts.get(r.prefecture) ?? 0) + 1);
    const month = new Date(r.checkedInAt).getMonth();
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  }

  const topPrefecture = [...prefectureCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topMonth = [...monthCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    year,
    count: yearRecords.length,
    prefectureCount: prefectureCounts.size,
    topPrefecture,
    topMonth,
  };
}
