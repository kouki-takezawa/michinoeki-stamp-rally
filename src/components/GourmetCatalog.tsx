import { useEffect, useState } from 'react';
import { getAllGourmetNotes, type GourmetNote } from '../lib/gourmet';
import type { Station } from '../lib/types';

interface Props {
  stations: Station[];
  onSelect: (id: string) => void;
}

export function GourmetCatalog({ stations, onSelect }: Props) {
  const [notes, setNotes] = useState<GourmetNote[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAllGourmetNotes().then((entries) => {
      if (!cancelled) {
        setNotes([...entries].sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!notes || notes.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="mb-2 text-sm font-bold">🍴 ご当地グルメ図鑑（{notes.length}件）</div>
      <div className="overflow-hidden rounded-lg border border-border">
        {notes.map((n) => {
          const station = stations.find((s) => s.id === n.stationId);
          if (!station) return null;
          return (
            <button
              key={n.stationId}
              type="button"
              onClick={() => onSelect(n.stationId)}
              className="flex w-full flex-col items-start gap-0.5 border-b border-border bg-surface px-4 py-3 text-left last:border-b-0 hover:bg-surface-2"
            >
              <span className="text-xs font-bold text-accent">
                {station.name}（{station.prefecture}）
              </span>
              <span className="text-sm text-ink-muted">{n.note}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
