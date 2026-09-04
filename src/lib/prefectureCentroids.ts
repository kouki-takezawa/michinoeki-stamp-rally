import type { Station } from './types';

export interface PrefectureCentroid {
  prefecture: string;
  lat: number;
  lng: number;
}

export function computeCentroids(stations: Station[]): PrefectureCentroid[] {
  const sums = new Map<string, { lat: number; lng: number; count: number }>();
  for (const s of stations) {
    const cur = sums.get(s.prefecture) ?? { lat: 0, lng: 0, count: 0 };
    cur.lat += s.lat;
    cur.lng += s.lng;
    cur.count += 1;
    sums.set(s.prefecture, cur);
  }
  return Array.from(sums.entries())
    .map(([prefecture, v]) => ({ prefecture, lat: v.lat / v.count, lng: v.lng / v.count }))
    .sort((a, b) => a.prefecture.localeCompare(b.prefecture, 'ja'));
}
