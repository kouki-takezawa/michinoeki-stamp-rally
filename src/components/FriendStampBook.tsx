import { useEffect, useState } from 'react';
import stations from '../data/michinoeki.json';
import type { FriendProfile } from '../lib/friends';
import { loadFriendCheckins, loadFriendFavorites } from '../lib/friends';
import { computePrefectureProgress } from '../lib/progress';
import type { CheckinRecord, Station } from '../lib/types';
import { StampBook } from './StampBook';

const allStations = stations as Station[];

interface Props {
  friend: FriendProfile;
  onClose: () => void;
}

export function FriendStampBook({ friend, onClose }: Props) {
  const [checkins, setCheckins] = useState<CheckinRecord[] | null>(null);
  const [favoriteCount, setFavoriteCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadFriendCheckins(friend.id), loadFriendFavorites(friend.id)]).then(([c, f]) => {
      if (cancelled) return;
      setCheckins(c);
      setFavoriteCount(f.size);
    });
    return () => {
      cancelled = true;
    };
  }, [friend.id]);

  const prefectureProgress = checkins ? computePrefectureProgress(checkins, allStations) : [];
  const recent = checkins
    ? [...checkins].sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt)).slice(0, 10)
    : [];

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

        {checkins === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">読み込み中…</p>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 text-center text-sm">
              <div className="rounded-lg bg-surface-2 p-3">
                <div className="text-lg font-bold">{checkins.length}</div>
                <div className="text-ink-faint">チェックイン数</div>
              </div>
              <div className="rounded-lg bg-surface-2 p-3">
                <div className="text-lg font-bold">{favoriteCount}</div>
                <div className="text-ink-faint">お気に入り数</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 text-xs font-bold text-ink-muted">都道府県別制覇率</div>
              <StampBook rows={prefectureProgress} />
            </div>

            {recent.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold text-ink-muted">最近の訪問</div>
                <div className="overflow-hidden rounded-lg border border-border">
                  {recent.map((r) => {
                    const station = allStations.find((s) => s.id === r.stationId);
                    if (!station) return null;
                    return (
                      <div
                        key={r.stationId}
                        className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5 text-sm last:border-b-0"
                      >
                        <span className="font-bold">{station.name}</span>
                        <span className="text-xs text-ink-faint">{station.prefecture}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
