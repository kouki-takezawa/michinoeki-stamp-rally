import { useRef } from 'react';

const EDGE_WIDTH = 24;
const THRESHOLD = 70;
const MAX_VERTICAL_DRIFT = 60;

// タブ切り替え用のスワイプ。地図のパン操作や横スクロールのストリップと衝突しないよう、
// 画面の左右端(EDGE_WIDTH)から始まったスワイプだけを対象にする(iOSのエッジスワイプに近い挙動)。
export function useTabSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const edge = useRef<'left' | 'right' | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const x = e.touches[0].clientX;
    const width = window.innerWidth;
    if (x <= EDGE_WIDTH) edge.current = 'left';
    else if (x >= width - EDGE_WIDTH) edge.current = 'right';
    else edge.current = null;
    startX.current = x;
    startY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!edge.current || startX.current === null || startY.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - startY.current);
    if (dy < MAX_VERTICAL_DRIFT) {
      if (edge.current === 'left' && dx > THRESHOLD) onSwipeRight();
      else if (edge.current === 'right' && dx < -THRESHOLD) onSwipeLeft();
    }
    edge.current = null;
    startX.current = null;
    startY.current = null;
  };

  return { onTouchStart, onTouchEnd };
}
