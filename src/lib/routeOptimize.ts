import { distanceMeters } from './distance';
import type { Station } from './types';

// 最近傍法による簡易巡回順の最適化（厳密な最短経路ではなく実用上十分な近似解）
export function optimizeRoute(start: { lat: number; lng: number }, points: Station[]): Station[] {
  const remaining = [...points];
  const route: Station[] = [];
  let current = start;
  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    remaining.forEach((p, i) => {
      const d = distanceMeters(current.lat, current.lng, p.lat, p.lng);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    });
    const [next] = remaining.splice(bestIndex, 1);
    route.push(next);
    current = next;
  }
  return route;
}
