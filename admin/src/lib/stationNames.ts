import stations from '../data/stations-lite.json';

interface StationLite {
  id: string;
  name: string;
  prefecture: string;
}

const byId = new Map<string, StationLite>((stations as StationLite[]).map((s) => [s.id, s]));

export function stationLabel(stationId: string): string {
  const s = byId.get(stationId);
  return s ? `${s.name}（${s.prefecture}）` : stationId;
}
