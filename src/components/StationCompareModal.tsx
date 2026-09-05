import { distanceMeters, formatDistance } from '../lib/distance';
import { FACILITY_ICON } from '../lib/facilityIcons';
import type { Station } from '../lib/types';

interface Props {
  stations: [Station, Station];
  position: { lat: number; lng: number } | null;
  checkedInIds: Set<string>;
  onClose: () => void;
}

// PC10(簡易版): お気に入りから選んだ2件を並べて比較する。汎用の「比較モード」というより、
// お気に入り一覧という既存の文脈に絞ることで、複雑な選択UIを増やさずに実装した。
export function StationCompareModal({ stations, position, checkedInIds, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">2件を比較</h2>
          <button type="button" onClick={onClose} className="text-sm text-ink-muted">
            閉じる
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {stations.map((s) => {
            const distanceM = position ? distanceMeters(position.lat, position.lng, s.lat, s.lng) : null;
            return (
              <div key={s.id} className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                <div className="mb-1 text-xs font-bold text-accent">{s.prefecture}</div>
                <div className="mb-2 font-black">{s.name}</div>
                <div className="mb-2">
                  {checkedInIds.has(s.id) ? (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">
                      ✓ 訪問済み
                    </span>
                  ) : (
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-ink-faint">未訪問</span>
                  )}
                </div>
                <div className="mb-2 text-xs text-ink-muted">
                  現在地から {distanceM !== null ? formatDistance(distanceM) : '—'}
                </div>
                <div className="flex flex-wrap gap-1">
                  {(s.facilities ?? []).length === 0 ? (
                    <span className="text-xs text-ink-faint">設備情報なし</span>
                  ) : (
                    s.facilities?.map((f) => (
                      <span
                        key={f}
                        className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-bold text-ink-muted"
                      >
                        {FACILITY_ICON[f] ?? '・'} {f}
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
