import { formatDistance } from '../lib/distance';
import { estimateEta } from '../lib/eta';
import type { StationWithDistance } from '../lib/types';

interface Props {
  station: StationWithDistance;
  isCheckedIn: boolean;
  isFavorite: boolean;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function StationListItem({
  station,
  isCheckedIn,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: Props) {
  const eta = estimateEta(station.distanceM);
  return (
    <div className="flex w-full items-center gap-1 border-b border-border bg-surface last:border-b-0 hover:bg-surface-2">
      <button
        type="button"
        onClick={() => onSelect(station.id)}
        className="min-w-0 flex-1 px-4 py-3 text-left"
      >
        <div className="truncate font-bold">
          {isCheckedIn && <span className="mr-1 text-accent">✓</span>}
          {station.name}
        </div>
        <div className="text-xs text-ink-faint">
          {station.prefecture} ・ 徒歩{eta.walk} / 車{eta.drive}
        </div>
      </button>
      <button
        type="button"
        onClick={() => onToggleFavorite(station.id)}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? 'お気に入りから外す' : 'お気に入りに追加'}
        className={`px-2 text-lg ${isFavorite ? 'text-amber-500' : 'text-ink-faint'}`}
      >
        {isFavorite ? '★' : '☆'}
      </button>
      <button
        type="button"
        onClick={() => onSelect(station.id)}
        className="shrink-0 px-4 py-3 font-mono text-sm font-bold text-accent"
      >
        {formatDistance(station.distanceM)}
      </button>
    </div>
  );
}
