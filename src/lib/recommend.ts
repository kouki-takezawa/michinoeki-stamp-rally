import { distanceMeters } from './distance';
import type { CheckinRecord, CheckinTag, Station } from './types';

const TAG_TO_FACILITIES: Record<CheckinTag, string[]> = {
  onsen: ['温泉'],
  meal: ['レストラン', '軽食・喫茶'],
  souvenir: ['ショップ'],
  rest: ['公園', '展望台', 'キャンプ場等'],
};

// F16: 外部LLMを使わず、過去の訪問タグの傾向と現在地からの近さだけでローカルにスコアリングする簡易レコメンド
export function recommendStations(
  stations: Station[],
  checkedStations: (Station & CheckinRecord)[],
  position: { lat: number; lng: number } | null,
  limit = 5,
  distanceMap?: Map<string, number>,
): Station[] {
  const facilityWeight = new Map<string, number>();
  for (const s of checkedStations) {
    if (!s.tag) continue;
    for (const facility of TAG_TO_FACILITIES[s.tag] ?? []) {
      facilityWeight.set(facility, (facilityWeight.get(facility) ?? 0) + 1);
    }
  }
  const checkedIds = new Set(checkedStations.map((s) => s.id));

  return stations
    .filter((s) => !checkedIds.has(s.id))
    .map((s) => {
      const matchScore = (s.facilities ?? []).reduce((sum, f) => sum + (facilityWeight.get(f) ?? 0), 0);
      let proximityScore = 0;
      const distanceM = distanceMap?.get(s.id) ?? (position ? distanceMeters(position.lat, position.lng, s.lat, s.lng) : undefined);
      if (distanceM !== undefined) {
        proximityScore = Math.max(0, 1 - distanceM / 150000);
      }
      return { station: s, score: matchScore * 2 + proximityScore * 3 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.station);
}
