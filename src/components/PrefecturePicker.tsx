import { useMemo, useState } from 'react';
import stations from '../data/michinoeki.json';
import { computeCentroids } from '../lib/prefectureCentroids';
import type { Station } from '../lib/types';

interface Props {
  onPick: (lat: number, lng: number, prefecture: string) => void;
  onCancel: () => void;
}

export function PrefecturePicker({ onPick, onCancel }: Props) {
  const centroids = useMemo(() => computeCentroids(stations as Station[]), []);
  const [selected, setSelected] = useState(centroids[0]?.prefecture ?? '');

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4 text-sm">
      <p className="mb-3 text-ink-muted">
        位置情報が使えない場合は、都道府県を選んでおおよその近さで探せます（正確な現在地ではないため、この方法ではチェックインはできません）。
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {centroids.map((c) => (
            <option key={c.prefecture} value={c.prefecture}>
              {c.prefecture}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            const c = centroids.find((c) => c.prefecture === selected);
            if (c) onPick(c.lat, c.lng, c.prefecture);
          }}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white"
        >
          この都道府県で探す
        </button>
      </div>
      <button type="button" onClick={onCancel} className="mt-2 text-xs text-ink-faint underline">
        閉じる
      </button>
    </div>
  );
}
