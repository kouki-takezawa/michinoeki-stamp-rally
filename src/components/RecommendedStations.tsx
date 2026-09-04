import { useMemo } from 'react';
import { recommendStations } from '../lib/recommend';
import type { CheckinRecord, Station } from '../lib/types';

interface Props {
  stations: Station[];
  checkedStations: (Station & CheckinRecord)[];
  position: { lat: number; lng: number } | null;
  onSelect: (id: string) => void;
}

export function RecommendedStations({ stations, checkedStations, position, onSelect }: Props) {
  const recommended = useMemo(
    () => recommendStations(stations, checkedStations, position, 6),
    [stations, checkedStations, position],
  );

  if (recommended.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="mb-2 text-sm font-bold">あなたへのおすすめ</div>
      <p className="mb-2 text-xs text-ink-faint">
        これまでの訪問メモの傾向{position ? 'と現在地からの近さ' : ''}をもとにした簡易的なおすすめです。
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {recommended.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className="flex w-32 shrink-0 flex-col items-start gap-0.5 rounded-lg border border-border bg-surface px-3 py-2 text-left"
          >
            <span className="w-full truncate text-xs font-bold">{s.name}</span>
            <span className="text-[11px] text-ink-faint">{s.prefecture}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
