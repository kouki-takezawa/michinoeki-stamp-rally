import { useState } from 'react';
import type { Station } from '../lib/types';

interface Props {
  stations: Station[];
  checkedInIds: Set<string>;
  prefectures: string[];
  onSelect: (id: string) => void;
}

export function StationGallery({ stations, checkedInIds, prefectures, onSelect }: Props) {
  const [prefecture, setPrefecture] = useState(prefectures[0] ?? '');
  const shown = stations.filter((s) => s.prefecture === prefecture);

  return (
    <div>
      <select
        value={prefecture}
        onChange={(e) => setPrefecture(e.target.value)}
        aria-label="都道府県で図鑑を絞り込み"
        className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      >
        {prefectures.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {shown.map((s) => {
          const done = checkedInIds.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              title={s.name}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg border p-1 text-center text-[10px] font-bold leading-tight ${
                done
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border bg-surface-2 text-ink-faint grayscale'
              }`}
            >
              <span aria-hidden="true" className="mb-0.5 text-base">
                {done ? '🅿️' : '🔒'}
              </span>
              <span className="line-clamp-2">{s.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
