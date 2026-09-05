import { useMemo } from 'react';
import { distanceMeters } from '../lib/distance';
import type { Station } from '../lib/types';

// 現在地(または手動選択位置)から全駅への距離を1回のテーブル計算にまとめる。
// 近接通知・レコメンド・近くの道の駅リストなど、同じ位置を使う複数機能がそれぞれ
// 全駅ループでhaversine計算をやり直すのを避けるための共有キャッシュ
export function useStationDistances(
  stations: Station[],
  position: { lat: number; lng: number } | null,
): Map<string, number> {
  return useMemo(() => {
    const map = new Map<string, number>();
    if (!position) return map;
    for (const s of stations) {
      map.set(s.id, distanceMeters(position.lat, position.lng, s.lat, s.lng));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, position?.lat, position?.lng]);
}
