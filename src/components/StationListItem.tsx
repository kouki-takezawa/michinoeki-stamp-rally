import { useRef, useState } from 'react';
import { formatDistance } from '../lib/distance';
import { estimateEta } from '../lib/eta';
import type { StationWithDistance } from '../lib/types';
import { HighlightedText } from './HighlightedText';

const DOUBLE_TAP_WINDOW_MS = 300;
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_TOLERANCE = 10;

interface Props {
  station: StationWithDistance;
  isCheckedIn: boolean;
  isFavorite: boolean;
  isHighlighted?: boolean;
  query?: string;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onHover?: (id: string | null) => void;
}

export function StationListItem({
  station,
  isCheckedIn,
  isFavorite,
  isHighlighted = false,
  query = '',
  onSelect,
  onToggleFavorite,
  onHover,
}: Props) {
  const eta = estimateEta(station.distanceM);
  const [burst, setBurst] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pendingTap = useRef<number | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressStart.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    longPressStart.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      setMenuOpen(true);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!longPressStart.current) return;
    const dx = e.clientX - longPressStart.current.x;
    const dy = e.clientY - longPressStart.current.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE) clearLongPress();
  };

  const handleTap = () => {
    if (pendingTap.current !== null) {
      window.clearTimeout(pendingTap.current);
      pendingTap.current = null;
      if (!isFavorite) {
        setBurst(true);
        setTimeout(() => setBurst(false), 500);
      }
      onToggleFavorite(station.id);
      return;
    }
    pendingTap.current = window.setTimeout(() => {
      pendingTap.current = null;
      onSelect(station.id);
    }, DOUBLE_TAP_WINDOW_MS);
  };

  return (
    <div
      onMouseEnter={() => onHover?.(station.id)}
      onMouseLeave={() => onHover?.(null)}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuOpen(true);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      className={`relative flex w-full items-center gap-1 border-b border-border bg-surface last:border-b-0 hover:bg-surface-2 ${
        isHighlighted ? 'ring-2 ring-inset ring-accent' : ''
      }`}
    >
      <button type="button" onClick={handleTap} className="min-w-0 flex-1 px-4 py-3 text-left">
        <div className="truncate font-bold">
          {isCheckedIn && <span className="mr-1 text-accent">✓</span>}
          <HighlightedText text={station.name} query={query} />
        </div>
        <div className="text-xs text-ink-faint">
          {station.prefecture} ・ 徒歩{eta.walk} / 車{eta.drive}
        </div>
      </button>
      <button
        type="button"
        onClick={() => onToggleFavorite(station.id)}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? 'お気に入りから外す' : 'お気に入りに追加'}
        className={`px-2 text-lg ${isFavorite ? 'text-amber-500' : 'text-ink-faint'}`}
      >
        <span key={String(isFavorite)} className="favorite-pop inline-block">
          {isFavorite ? '★' : '☆'}
        </span>
      </button>
      <button type="button" onClick={handleTap} className="shrink-0 px-4 py-3 font-mono text-sm font-bold text-accent">
        {formatDistance(station.distanceM)}
      </button>
      {burst && (
        <span
          aria-hidden="true"
          className="stamp-pop pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 text-2xl"
        >
          ⭐
        </span>
      )}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-2 top-full z-40 mt-1 min-w-40 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            <a
              href={navUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-left text-sm font-bold text-ink hover:bg-surface-2"
            >
              📍 経路を見る
            </a>
            <button
              type="button"
              onClick={() => {
                onToggleFavorite(station.id);
                setMenuOpen(false);
              }}
              className="block w-full px-4 py-2.5 text-left text-sm font-bold text-ink hover:bg-surface-2"
            >
              {isFavorite ? '☆ お気に入りから外す' : '★ お気に入りに追加'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
