import { useRef, useState, type ReactNode } from 'react';
import { MOBILE_TABBAR_SPACE } from '../lib/layout';

type SnapState = 'peek' | 'half' | 'full';

interface Props {
  children: ReactNode;
  header?: ReactNode;
  defaultState?: SnapState;
}

function snapPx(state: SnapState): number {
  const vh = window.innerHeight;
  if (state === 'peek') return 128;
  if (state === 'half') return vh * 0.5;
  return vh * 0.88;
}

export function BottomSheet({ children, header, defaultState = 'half' }: Props) {
  const [state, setState] = useState<SnapState>(defaultState);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const startHeight = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    startHeight.current = dragHeight ?? snapPx(state);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const delta = dragStartY.current - e.clientY;
    const next = Math.max(80, Math.min(window.innerHeight * 0.94, startHeight.current + delta));
    setDragHeight(next);
  };

  const onPointerUp = () => {
    if (dragStartY.current === null) return;
    dragStartY.current = null;
    const current = dragHeight ?? snapPx(state);
    const snaps: SnapState[] = ['peek', 'half', 'full'];
    let closest: SnapState = 'peek';
    let bestDiff = Infinity;
    for (const s of snaps) {
      const diff = Math.abs(snapPx(s) - current);
      if (diff < bestDiff) {
        bestDiff = diff;
        closest = s;
      }
    }
    setState(closest);
    setDragHeight(null);
  };

  const isDragging = dragHeight !== null;
  const height = isDragging ? `${dragHeight}px` : `${snapPx(state)}px`;

  return (
    <div
      style={{ height, bottom: MOBILE_TABBAR_SPACE }}
      className={`fixed inset-x-0 z-20 flex flex-col rounded-t-2xl border-t border-border bg-surface shadow-[0_-6px_20px_rgba(0,0,0,0.12)] lg:hidden ${
        isDragging ? '' : 'transition-[height] duration-200 ease-out'
      }`}
    >
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={() => {
          if (isDragging) return;
          setState((s) => (s === 'peek' ? 'half' : s === 'half' ? 'full' : 'peek'));
        }}
        aria-label="リストの表示範囲を変更"
        className="flex shrink-0 touch-none flex-col items-center gap-2 pb-1 pt-2.5"
      >
        <span className="h-1.5 w-10 rounded-full bg-border" />
      </button>
      {header && <div className="shrink-0 px-4 pb-2">{header}</div>}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
    </div>
  );
}
