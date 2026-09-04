import type { CheckinRecord, Station } from '../lib/types';
import { HistoryPhotoThumb } from './HistoryPhotoThumb';

interface Props {
  checkedStations: (Station & CheckinRecord)[];
  onSelect: (id: string) => void;
}

export function PhotoAlbum({ checkedStations, onSelect }: Props) {
  const withPhotos = checkedStations.filter((s) => s.hasPhoto);
  if (withPhotos.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="mb-2 text-sm font-bold">📷 思い出アルバム（{withPhotos.length}件）</div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {withPhotos.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-2"
          >
            <HistoryPhotoThumb stationId={s.id} className="h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-1 text-left text-[10px] font-bold text-white">
              {s.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
