import { profileScopedKey } from './profiles';
import type { CheckinExport, CheckinRecord, CheckinTag } from './types';

const BASE_KEY = 'michinoeki-checkins-v1';

export function loadCheckins(): CheckinRecord[] {
  try {
    const raw = localStorage.getItem(profileScopedKey(BASE_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is CheckinRecord =>
        r && typeof r.stationId === 'string' && typeof r.checkedInAt === 'string',
    );
  } catch {
    return [];
  }
}

function saveCheckins(records: CheckinRecord[]): void {
  try {
    localStorage.setItem(profileScopedKey(BASE_KEY), JSON.stringify(records));
  } catch {
    // 保存不可（プライベートモード等）でもアプリ自体は動作継続する
    console.error('チェックイン履歴の保存に失敗しました');
  }
}

export function addCheckin(stationId: string): CheckinRecord[] {
  const current = loadCheckins();
  if (current.some((r) => r.stationId === stationId)) return current;
  const next = [...current, { stationId, checkedInAt: new Date().toISOString() }];
  saveCheckins(next);
  return next;
}

export function setCheckinTag(stationId: string, tag: CheckinTag): CheckinRecord[] {
  const current = loadCheckins();
  const next = current.map((r) => (r.stationId === stationId ? { ...r, tag } : r));
  saveCheckins(next);
  return next;
}

export function setCheckinHasPhoto(stationId: string, hasPhoto: boolean): CheckinRecord[] {
  const current = loadCheckins();
  const next = current.map((r) => (r.stationId === stationId ? { ...r, hasPhoto } : r));
  saveCheckins(next);
  return next;
}

export function removeCheckin(stationId: string): CheckinRecord[] {
  const next = loadCheckins().filter((r) => r.stationId !== stationId);
  saveCheckins(next);
  return next;
}

export function restoreCheckin(record: CheckinRecord): CheckinRecord[] {
  const current = loadCheckins();
  if (current.some((r) => r.stationId === record.stationId)) return current;
  const next = [...current, record];
  saveCheckins(next);
  return next;
}

export function buildExport(records: CheckinRecord[], favorites: string[]): CheckinExport {
  return {
    app: 'michinoeki-stamp-rally',
    version: 2,
    exportedAt: new Date().toISOString(),
    checkins: records,
    favorites,
  };
}

export function parseImport(text: string): { checkins: CheckinRecord[]; favorites: string[] } {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : data?.checkins;
  if (!Array.isArray(list)) throw new Error('不正なファイル形式です');
  const valid = list.filter(
    (r): r is CheckinRecord =>
      r && typeof r.stationId === 'string' && typeof r.checkedInAt === 'string',
  );
  if (valid.length === 0) throw new Error('有効なチェックインデータが見つかりません');
  const favorites = Array.isArray(data?.favorites)
    ? data.favorites.filter((v: unknown): v is string => typeof v === 'string')
    : [];
  return { checkins: valid, favorites };
}

export function mergeCheckins(
  existing: CheckinRecord[],
  incoming: CheckinRecord[],
): CheckinRecord[] {
  const byId = new Map(existing.map((r) => [r.stationId, r]));
  for (const r of incoming) {
    const current = byId.get(r.stationId);
    if (!current || new Date(r.checkedInAt) < new Date(current.checkedInAt)) {
      byId.set(r.stationId, r);
    }
  }
  const merged = Array.from(byId.values());
  saveCheckins(merged);
  return merged;
}
