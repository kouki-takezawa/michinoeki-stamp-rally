import { supabase } from './supabaseClient';
import type { CheckinRecord } from './types';

// ログイン中は、ローカル(localStorage)の状態が変わるたびにこの関数でSupabaseへ反映する。
// 初回ログイン時の移行も兼ねる（cloud側が空なら今のローカル状態がそのままアップロードされる）。
// アップサート後に「ローカルに存在しないstation_id」をcloud側から削除することで、
// チェックイン取り消し・お気に入り解除もクラウド側に反映される。
export async function reconcileCheckinsToCloud(userId: string, records: CheckinRecord[]): Promise<void> {
  try {
    if (records.length > 0) {
      const rows = records.map((c) => ({
        user_id: userId,
        station_id: c.stationId,
        checked_in_at: c.checkedInAt,
        tag: c.tag ?? null,
        has_photo: c.hasPhoto ?? false,
      }));
      await supabase.from('checkins').upsert(rows, { onConflict: 'user_id,station_id' });
    }
    const { data } = await supabase.from('checkins').select('station_id').eq('user_id', userId);
    const localIds = new Set(records.map((r) => r.stationId));
    const staleIds = (data ?? []).map((r) => r.station_id as string).filter((id) => !localIds.has(id));
    if (staleIds.length > 0) {
      await supabase.from('checkins').delete().eq('user_id', userId).in('station_id', staleIds);
    }
  } catch {
    // ネットワークエラー等は握りつぶす（次回の変更時に再試行される）
  }
}

export async function reconcileFavoritesToCloud(userId: string, favoriteIds: Set<string>): Promise<void> {
  try {
    const ids = Array.from(favoriteIds);
    if (ids.length > 0) {
      const rows = ids.map((stationId) => ({ user_id: userId, station_id: stationId }));
      await supabase.from('favorites').upsert(rows, { onConflict: 'user_id,station_id' });
    }
    const { data } = await supabase.from('favorites').select('station_id').eq('user_id', userId);
    const staleIds = (data ?? []).map((r) => r.station_id as string).filter((id) => !favoriteIds.has(id));
    if (staleIds.length > 0) {
      await supabase.from('favorites').delete().eq('user_id', userId).in('station_id', staleIds);
    }
  } catch {
    // ignore
  }
}
