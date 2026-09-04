import stations from '../data/michinoeki.json';
import type { Station } from '../lib/types';

const allStations = stations as Station[];

interface Props {
  favorites: Set<string>;
  checkedInIds: Set<string>;
  onSelect: (id: string) => void;
}

export function FavoritesList({ favorites, checkedInIds, onSelect }: Props) {
  const items = allStations.filter((s) => favorites.has(s.id));

  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        まだお気に入りがありません。一覧の☆をタップすると追加できます。
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {items.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          className="flex w-full items-center justify-between border-b border-border bg-surface px-4 py-3 text-left last:border-b-0 hover:bg-surface-2"
        >
          <div>
            <div className="font-bold">
              {checkedInIds.has(s.id) && <span className="mr-1 text-accent">✓</span>}
              {s.name}
            </div>
            <div className="text-xs text-ink-faint">{s.prefecture}</div>
          </div>
          <span className="text-amber-500">★</span>
        </button>
      ))}
    </div>
  );
}
