import { useState } from 'react';
import { precacheAreaTiles } from '../lib/tilePrecache';

interface Props {
  position: { lat: number; lng: number };
}

export function OfflineMapButton({ position }: Props) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [finished, setFinished] = useState(false);

  const running = progress !== null && progress.done < progress.total;

  const handleClick = async () => {
    setFinished(false);
    setProgress({ done: 0, total: 1 });
    await precacheAreaTiles(position.lat, position.lng, setProgress);
    setFinished(true);
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={running}
        className="w-full rounded-lg border border-border bg-surface py-2 text-xs font-bold text-accent disabled:opacity-60"
      >
        {running
          ? `地図を保存中… (${progress.done}/${progress.total})`
          : finished
            ? '✓ この周辺の地図を保存しました'
            : '📥 この周辺の地図をオフライン保存'}
      </button>
      <p className="mt-1 text-[11px] text-ink-faint">
        電波が弱い場所でも表示できるよう、現在地周辺の地図タイルを端末に保存します。
      </p>
    </div>
  );
}
