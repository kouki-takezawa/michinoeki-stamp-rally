import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MOBILE_TABBAR_SPACE, SHEET_PEEK_PX } from '../lib/layout';

type SnapState = 'peek' | 'half' | 'full';

interface Props {
  children: ReactNode;
  header?: ReactNode;
  defaultState?: SnapState;
  // 値が変わるたびに'peek'へスナップし直す(地図上でピンをタップした際に、プレビューカードの
  // すぐ下にシートを畳んでおくために使う。値そのものは使わずキーとしてのみ利用)
  forcePeekKey?: string | null;
  // 引っ張って更新(現在地の再取得)。指定時のみ、本文の先頭でさらに下に引くと呼ばれる
  onPullToRefresh?: () => void;
}

function snapPx(state: SnapState): number {
  const vh = window.innerHeight;
  // 横向き等でvhが小さい端末では、固定pxのpeekが画面に対して相対的に大きくなり地図を覆ってしまうため、
  // 「固定128px」と「画面高さの18%」の小さい方を採る（縦向きの通常端末では従来通り128pxのまま）
  if (state === 'peek') return Math.min(SHEET_PEEK_PX, vh * 0.18);
  if (state === 'half') return vh * 0.5;
  return vh * 0.88;
}

const PULL_THRESHOLD = 70;

export function BottomSheet({ children, header, defaultState = 'half', forcePeekKey, onPullToRefresh }: Props) {
  const [state, setState] = useState<SnapState>(defaultState);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const startHeight = useRef(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartY = useRef<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (forcePeekKey) setState('peek');
  }, [forcePeekKey]);

  const onHandlePointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    startHeight.current = dragHeight ?? snapPx(state);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const delta = dragStartY.current - e.clientY;
    const next = Math.max(60, Math.min(window.innerHeight * 0.94, startHeight.current + delta));
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

  // 本文エリアの先頭までスクロールした状態でさらに下に引いたら現在地を再取得する(プルトゥリフレッシュ)
  const onContentTouchStart = (e: React.TouchEvent) => {
    if (!onPullToRefresh || contentRef.current?.scrollTop !== 0) return;
    pullStartY.current = e.touches[0].clientY;
  };
  const onContentTouchMove = (e: React.TouchEvent) => {
    if (pullStartY.current === null) return;
    const dy = e.touches[0].clientY - pullStartY.current;
    if (dy > 0 && contentRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(dy, 90));
    } else {
      pullStartY.current = null;
      setPullDistance(0);
    }
  };
  const onContentTouchEnd = () => {
    if (pullDistance > PULL_THRESHOLD && onPullToRefresh) {
      setRefreshing(true);
      onPullToRefresh();
      setTimeout(() => setRefreshing(false), 1200);
    }
    pullStartY.current = null;
    setPullDistance(0);
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
      {/* ハンドル部分だけでなく、ヘッダー領域全体を掴んでドラッグできるようにする */}
      <div
        onPointerDown={onHandlePointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="shrink-0 touch-none"
      >
        <button
          type="button"
          onClick={() => {
            if (isDragging) return;
            setState((s) => (s === 'peek' ? 'half' : s === 'half' ? 'full' : 'peek'));
          }}
          aria-label="リストの表示範囲を変更"
          className="flex w-full flex-col items-center gap-2 pb-1 pt-2.5"
        >
          <span className="h-1.5 w-10 rounded-full bg-border" />
        </button>
        {header && <div className="px-4 pb-2">{header}</div>}
      </div>
      <div
        ref={contentRef}
        onTouchStart={onContentTouchStart}
        onTouchMove={onContentTouchMove}
        onTouchEnd={onContentTouchEnd}
        className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4"
      >
        {onPullToRefresh && (pullDistance > 0 || refreshing) && (
          <div
            className="flex items-center justify-center overflow-hidden text-xs font-bold text-ink-faint transition-[height]"
            style={{ height: refreshing ? 32 : Math.min(pullDistance, 60) }}
          >
            {refreshing ? '更新中…' : pullDistance > PULL_THRESHOLD ? '離すと更新' : '引いて現在地を更新'}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
