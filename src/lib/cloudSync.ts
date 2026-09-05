import { supabase } from './supabaseClient';
import type { CheckinRecord } from './types';

// ログイン中は、ローカル(localStorage)の状態が変わるたびにこの関数でSupabaseへ反映する。
// 初回ログイン時の移行も兼ねる（cloud側が空なら今のローカル状態がそのままアップロードされる）。
// 前回同期した内容をメモリ上に保持し、実際に変化があった行だけをupsert/deleteすることで、
// 変更のたびに全件を送り直したり全件セレクトで突き合わせたりする無駄を減らす
// (タブを開き直すと差分の基準がリセットされるが、その場合は最初の1回だけ全件を送り直すだけで
//  安全側に倒れる)。
const lastSyncedCheckins = new Map<string, Map<string, string>>(); // userId -> stationId -> JSON snapshot
const lastSyncedFavorites = new Map<string, Set<string>>();

export async function reconcileCheckinsToCloud(userId: string, records: CheckinRecord[]): Promise<void> {
  const prev = lastSyncedCheckins.get(userId) ?? new Map<string, string>();
  const nextSnapshots = new Map<string, string>();
  const toUpsert: CheckinRecord[] = [];

  for (const r of records) {
    const snapshot = JSON.stringify([r.checkedInAt, r.tag ?? null, r.hasPhoto ?? false]);
    nextSnapshots.set(r.stationId, snapshot);
    if (prev.get(r.stationId) !== snapshot) toUpsert.push(r);
  }
  const toDelete = [...prev.keys()].filter((id) => !nextSnapshots.has(id));

  if (toUpsert.length === 0 && toDelete.length === 0) return;

  try {
    if (toUpsert.length > 0) {
      const rows = toUpsert.map((c) => ({
        user_id: userId,
        station_id: c.stationId,
        checked_in_at: c.checkedInAt,
        tag: c.tag ?? null,
        has_photo: c.hasPhoto ?? false,
      }));
      await supabase.from('checkins').upsert(rows, { onConflict: 'user_id,station_id' });
    }
    if (toDelete.length > 0) {
      await supabase.from('checkins').delete().eq('user_id', userId).in('station_id', toDelete);
    }
    lastSyncedCheckins.set(userId, nextSnapshots);
  } catch {
    // ネットワークエラー等はスナップショットを更新せず、次回の変更時に同じ差分で再試行させる
  }
}

export async function reconcileFavoritesToCloud(userId: string, favoriteIds: Set<string>): Promise<void> {
  const prev = lastSyncedFavorites.get(userId) ?? new Set<string>();
  const toAdd = [...favoriteIds].filter((id) => !prev.has(id));
  const toRemove = [...prev].filter((id) => !favoriteIds.has(id));

  if (toAdd.length === 0 && toRemove.length === 0) return;

  try {
    if (toAdd.length > 0) {
      const rows = toAdd.map((stationId) => ({ user_id: userId, station_id: stationId }));
      await supabase.from('favorites').upsert(rows, { onConflict: 'user_id,station_id' });
    }
    if (toRemove.length > 0) {
      await supabase.from('favorites').delete().eq('user_id', userId).in('station_id', toRemove);
    }
    lastSyncedFavorites.set(userId, new Set(favoriteIds));
  } catch {
    // ignore
  }
}
