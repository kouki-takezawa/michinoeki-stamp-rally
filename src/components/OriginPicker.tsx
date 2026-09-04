import { useState } from 'react';
import type { Origin } from '../lib/journey';

interface Props {
  origin: Origin | null;
  onSet: (origin: Origin) => void;
  onRemove: () => void;
}

export function OriginPicker({ origin, onSet, onRemove }: Props) {
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('自宅');

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSet({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: label || '出発地点' });
        setBusy(false);
      },
      () => setBusy(false),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  if (origin) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span>
          出発地点：<span className="font-bold">{origin.label}</span>
        </span>
        <button type="button" onClick={onRemove} className="text-xs text-ink-faint underline">
          解除
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="出発地点の名前（例：自宅）"
        className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
      />
      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={busy}
        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
      >
        {busy ? '取得中…' : '現在地を出発地点にする'}
      </button>
    </div>
  );
}
