import { useRef } from 'react';

const EDGE_WIDTH = 28;
const THRESHOLD = 80;
const MAX_VERTICAL_DRIFT = 60;

export function useSwipeBack(onBack: () => void) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const active = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    const x = e.touches[0].clientX;
    if (x <= EDGE_WIDTH) {
      startX.current = x;
      startY.current = e.touches[0].clientY;
      active.current = true;
    } else {
      active.current = false;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!active.current || startX.current === null || startY.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = Math.abs(e.touches[0].clientY - startY.current);
    if (dx > THRESHOLD && dy < MAX_VERTICAL_DRIFT) {
      active.current = false;
      if (navigator.vibrate) navigator.vibrate(12);
      onBack();
    }
  };

  const onTouchEnd = () => {
    active.current = false;
    startX.current = null;
    startY.current = null;
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}
