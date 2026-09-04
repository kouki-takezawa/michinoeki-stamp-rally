import { useMemo, useState } from 'react';
import stations from '../data/michinoeki.json';
import { optimizeRoute } from '../lib/routeOptimize';
import type { Station } from '../lib/types';
import { EmptyState } from './EmptyState';

const allStations = stations as Station[];

interface Props {
  favorites: Set<string>;
  checkedInIds: Set<string>;
  position: { lat: number; lng: number } | null;
  onSelect: (id: string) => void;
}

export function FavoritesList({ favorites, checkedInIds, position, onSelect }: Props) {
  const [routeMode, setRouteMode] = useState(false);
  const items = useMemo(() => allStations.filter((s) => favorites.has(s.id)), [favorites]);

  const orderedItems = useMemo(() => {
    if (!routeMode || !position || items.length < 2) return items;
    return optimizeRoute(position, items);
  }, [routeMode, position, items]);

  if (items.length === 0) {
    return (
      <EmptyState
        emoji="⭐"
        title="まだお気に入りがありません"
        hint="一覧の☆をタップすると追加できます"
      />
    );
  }

  return (
    <div>
      {position && items.length >= 2 && (
        <label className="mb-2 flex items-center gap-1.5 text-xs text-ink-muted">
          <input type="checkbox" checked={routeMode} onChange={(e) => setRouteMode(e.target.checked)} />
          現在地から効率よく回れる順に並び替える
        </label>
      )}
      <div className="overflow-hidden rounded-lg border border-border">
        {orderedItems.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className="flex w-full items-center justify-between border-b border-border bg-surface px-4 py-3 text-left last:border-b-0 hover:bg-surface-2"
          >
            <div className="flex items-center gap-2">
              {routeMode && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent">
                  {i + 1}
                </span>
              )}
              <div>
                <div className="font-bold">
                  {checkedInIds.has(s.id) && <span className="mr-1 text-accent">✓</span>}
                  {s.name}
                </div>
                <div className="text-xs text-ink-faint">{s.prefecture}</div>
              </div>
            </div>
            <span className="text-amber-500">★</span>
          </button>
        ))}
      </div>
    </div>
  );
}
