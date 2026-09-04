import { formatDistance } from '../lib/distance';
import type { StationWithDistance } from '../lib/types';

interface Props {
  stations: StationWithDistance[];
  checkedInIds: Set<string>;
  onSelect: (id: string) => void;
}

export function NearbyStrip({ stations, checkedInIds, onSelect }: Props) {
  if (stations.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {stations.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          className="flex w-28 shrink-0 flex-col items-start gap-0.5 rounded-lg border border-border bg-surface px-3 py-2 text-left"
        >
          <span className="w-full truncate text-xs font-bold">
            {checkedInIds.has(s.id) && <span className="mr-0.5 text-accent">✓</span>}
            {s.name}
          </span>
          <span className="text-[11px] font-bold text-accent">{formatDistance(s.distanceM)}</span>
        </button>
      ))}
    </div>
  );
}
