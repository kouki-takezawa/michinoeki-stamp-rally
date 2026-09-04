import { REGIONS } from './regions';

export type Milestone =
  | { kind: 'first' }
  | { kind: 'count'; count: number }
  | { kind: 'prefecture-complete'; prefecture: string }
  | { kind: 'region-complete'; region: string }
  | { kind: 'all-prefectures' }
  | { kind: 'streak'; days: number };

const COUNT_MILESTONES = [10, 25, 50, 100, 200, 500];
const STREAK_MILESTONES = [3, 7, 30, 100];

interface PrefectureRow {
  prefecture: string;
  total: number;
  done: number;
}

function regionComplete(prefectures: PrefectureRow[], regionPrefectures: string[]): boolean {
  const byName = new Map(prefectures.map((p) => [p.prefecture, p]));
  return regionPrefectures.every((name) => {
    const row = byName.get(name);
    return row !== undefined && row.total > 0 && row.done >= row.total;
  });
}

export function detectMilestones(
  prevTotal: number,
  nextTotal: number,
  prevPrefectures: PrefectureRow[],
  nextPrefectures: PrefectureRow[],
  prevStreak: number,
  nextStreak: number,
): Milestone[] {
  const milestones: Milestone[] = [];

  if (prevTotal === 0 && nextTotal === 1) {
    milestones.push({ kind: 'first' });
  }
  for (const c of COUNT_MILESTONES) {
    if (prevTotal < c && nextTotal >= c) milestones.push({ kind: 'count', count: c });
  }

  const prevByPref = new Map(prevPrefectures.map((p) => [p.prefecture, p]));
  for (const p of nextPrefectures) {
    const prev = prevByPref.get(p.prefecture);
    const prevDone = prev?.done ?? 0;
    if (prevDone < p.total && p.done >= p.total && p.total > 0) {
      milestones.push({ kind: 'prefecture-complete', prefecture: p.prefecture });
    }
  }

  for (const region of REGIONS) {
    if (region.prefectures.length < 2) continue;
    const wasComplete = regionComplete(prevPrefectures, region.prefectures);
    const isComplete = regionComplete(nextPrefectures, region.prefectures);
    if (!wasComplete && isComplete) {
      milestones.push({ kind: 'region-complete', region: region.name });
    }
  }

  const prevAllDone = prevPrefectures.length > 0 && prevPrefectures.every((p) => p.done > 0);
  const nextAllDone = nextPrefectures.length > 0 && nextPrefectures.every((p) => p.done > 0);
  if (!prevAllDone && nextAllDone) {
    milestones.push({ kind: 'all-prefectures' });
  }

  for (const s of STREAK_MILESTONES) {
    if (prevStreak < s && nextStreak >= s) milestones.push({ kind: 'streak', days: s });
  }

  return milestones;
}
