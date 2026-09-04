import { distanceMeters } from './distance';
import type { Station } from './types';

export function pickRouletteStation(
  stations: Station[],
  checkedInIds: Set<string>,
  position: { lat: number; lng: number } | null,
): Station | null {
  const unvisited = stations.filter((s) => !checkedInIds.has(s.id));
  if (unvisited.length === 0) return null;

  if (!position) {
    return unvisited[Math.floor(Math.random() * unvisited.length)];
  }

  // 近いものほど選ばれやすいように、距離順で上位からの重み付き抽選にする
  const withDistance = unvisited
    .map((s) => ({ s, d: distanceMeters(position.lat, position.lng, s.lat, s.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 100);
  const weights = withDistance.map((_, i) => 1 / (i + 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < withDistance.length; i++) {
    r -= weights[i];
    if (r <= 0) return withDistance[i].s;
  }
  return withDistance[0].s;
}
