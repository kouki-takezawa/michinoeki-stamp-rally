import { useRef, useState, type ReactNode } from 'react';

const THRESHOLD = 70;

interface Props {
  onRefresh: () => void;
  children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((containerRef.current?.scrollTop ?? 0) <= 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setPull(Math.min(delta * 0.5, 100));
    }
  };

  const handleTouchEnd = () => {
    if (pull > THRESHOLD && !refreshing) {
      setRefreshing(true);
      onRefresh();
      setTimeout(() => setRefreshing(false), 800);
    }
    setPull(0);
    startY.current = null;
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{ height: refreshing ? 40 : pull }}
        className="flex items-center justify-center overflow-hidden text-xs font-bold text-ink-faint transition-[height]"
      >
        {refreshing ? '更新中…' : pull > THRESHOLD ? '離して更新' : pull > 0 ? '引っ張って更新' : ''}
      </div>
      {children}
    </div>
  );
}
