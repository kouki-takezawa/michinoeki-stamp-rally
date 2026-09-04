interface PrefectureRow {
  prefecture: string;
  total: number;
  done: number;
}

export interface NearCompletion {
  prefecture: string;
  remaining: number;
  total: number;
}

export function findNearCompletion(rows: PrefectureRow[], limit = 3): NearCompletion[] {
  return rows
    .filter((r) => r.done > 0 && r.done < r.total)
    .map((r) => ({ prefecture: r.prefecture, remaining: r.total - r.done, total: r.total }))
    .sort((a, b) => a.remaining - b.remaining)
    .slice(0, limit);
}
