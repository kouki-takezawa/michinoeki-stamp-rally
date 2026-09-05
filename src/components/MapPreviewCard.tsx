import { formatDistance } from '../lib/distance';
import { buildDirectionsUrl } from '../lib/navigation';
import type { Station } from '../lib/types';

interface Props {
  station: Station;
  distanceM: number | null;
  origin?: { lat: number; lng: number } | null;
  isCheckedIn: boolean;
  isFavorite: boolean;
  onOpenDetail: () => void;
  onClose: () => void;
}

// Google/Apple マップの「ピンをタップ→簡易プレビュー→もう一度タップで詳細」の挙動を再現する
// ミニカード。ここでは開かず、詳細画面(DetailOverlay)を開くかどうかは呼び出し元に委ねる。
export function MapPreviewCard({ station, distanceM, origin, isCheckedIn, isFavorite, onOpenDetail, onClose }: Props) {
  const navUrl = buildDirectionsUrl(station, origin);

  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border bg-surface p-3 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpenDetail} className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm font-black">
            {isCheckedIn && <span className="mr-1 text-accent">✓</span>}
            {isFavorite && <span className="mr-1 text-amber-500">★</span>}
            {station.name}
          </div>
          <div className="mt-0.5 text-xs text-ink-faint">
            {station.prefecture}
            {distanceM !== null && <span className="ml-1.5 font-bold text-accent">{formatDistance(distanceM)}</span>}
          </div>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="shrink-0 rounded-full px-1.5 text-lg leading-none text-ink-faint"
        >
          ×
        </button>
      </div>
      <div className="mt-2.5 flex gap-2">
        <a
          href={navUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 rounded-lg border border-border py-2 text-center text-xs font-bold text-accent"
        >
          📍 経路
        </a>
        <button
          type="button"
          onClick={onOpenDetail}
          className="flex-1 rounded-lg bg-accent py-2 text-xs font-bold text-white"
        >
          詳細を見る →
        </button>
      </div>
    </div>
  );
}
