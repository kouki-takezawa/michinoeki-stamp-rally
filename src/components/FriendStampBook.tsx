import { useEffect, useState } from 'react';
import stations from '../data/michinoeki.json';
import type { FriendProfile } from '../lib/friends';
import { loadFriendFavorites, loadFriendVisitedStationIds } from '../lib/friends';
import { computePrefectureProgress } from '../lib/progress';
import type { Station } from '../lib/types';
import { StampBook } from './StampBook';

const allStations = stations as Station[];

interface Props {
  friend: FriendProfile;
  myCheckedInIds: Set<string>;
  onJumpToPrefecture: (prefecture: string) => void;
  onClose: () => void;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ok'; visitedStationIds: string[]; favoriteCount: number };

export function FriendStampBook({ friend, myCheckedInIds, onJumpToPrefecture, onClose }: Props) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    Promise.all([loadFriendVisitedStationIds(friend.id), loadFriendFavorites(friend.id)]).then(
      ([visited, favorites]) => {
        if (cancelled) return;
        if (visited.error || favorites.error) {
          setState({ status: 'error' });
          return;
        }
        setState({ status: 'ok', visitedStationIds: visited.data, favoriteCount: favorites.data.size });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [friend.id]);

  const prefectureProgress =
    state.status === 'ok'
      ? computePrefectureProgress(
          state.visitedStationIds.map((stationId) => ({ stationId })),
          allStations,
        )
      : [];

  // 「自分もこの県に行ってみる」導線: 友達が訪問済みで自分が未訪問の都道府県のうち、
  // 友達の訪問件数が最も多いものを1件だけ提案する（複数出すと押し付けがましくなるため）
  const myVisitedPrefectures =
    state.status === 'ok' ? new Set(allStations.filter((s) => myCheckedInIds.has(s.id)).map((s) => s.prefecture)) : null;
  let suggestion: { prefecture: string; count: number } | null = null;
  if (state.status === 'ok' && myVisitedPrefectures) {
    const counts = new Map<string, number>();
    for (const id of state.visitedStationIds) {
      const st = allStations.find((s) => s.id === id);
      if (!st || myVisitedPrefectures.has(st.prefecture)) continue;
      counts.set(st.prefecture, (counts.get(st.prefecture) ?? 0) + 1);
    }
    for (const [prefecture, count] of counts) {
      if (!suggestion || count > suggestion.count) suggestion = { prefecture, count };
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">{friend.displayName}さんのスタンプ帳</h2>
          <button type="button" onClick={onClose} className="text-sm text-ink-muted">
            閉じる
          </button>
        </div>

        {state.status === 'loading' ? (
          <p className="py-8 text-center text-sm text-ink-muted">読み込み中…</p>
        ) : state.status === 'error' ? (
          <div className="py-8 text-center text-sm text-red-700">
            <p className="font-bold">読み込みに失敗しました</p>
            <p className="mt-1 text-xs text-ink-faint">
              相手が共有をOFFにしているか、通信エラーの可能性があります。
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 text-center text-sm">
              <div className="rounded-lg bg-surface-2 p-3">
                <div className="text-lg font-bold">{state.visitedStationIds.length}</div>
                <div className="text-ink-faint">訪問済み駅数</div>
              </div>
              <div className="rounded-lg bg-surface-2 p-3">
                <div className="text-lg font-bold">{state.favoriteCount}</div>
                <div className="text-ink-faint">お気に入り数</div>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-bold text-ink-muted">都道府県別制覇率</div>
              <StampBook rows={prefectureProgress} />
            </div>

            {suggestion && (
              <div className="mt-4 rounded-lg border border-accent/40 bg-accent-soft p-3 text-sm">
                <p className="mb-2">
                  {friend.displayName}さんは<strong>{suggestion.prefecture}</strong>
                  の道の駅を{suggestion.count}件訪問済みですが、あなたはまだ訪問していません。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onJumpToPrefecture(suggestion.prefecture);
                    onClose();
                  }}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white"
                >
                  自分も{suggestion.prefecture}に行ってみる →
                </button>
              </div>
            )}
            <p className="mt-4 text-[11px] text-ink-faint">
              プライバシーへの配慮のため、訪問日時・写真・メモは共有されません。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
