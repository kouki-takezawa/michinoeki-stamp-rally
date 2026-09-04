import { useEffect, useState, type ReactNode } from 'react';
import { useSwipeBack } from '../hooks/useSwipeBack';

interface Props {
  children: ReactNode;
  onClose: () => void;
}

export function DetailOverlay({ children, onClose }: Props) {
  const [entered, setEntered] = useState(false);
  const swipe = useSwipeBack(onClose);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 hidden bg-black/40 lg:block" onClick={onClose} />
      <div
        {...swipe}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        className={`absolute inset-0 overflow-y-auto bg-bg transition-transform duration-300 ease-out lg:inset-y-6 lg:left-1/2 lg:right-auto lg:w-full lg:max-w-2xl lg:-translate-x-1/2 lg:rounded-2xl lg:shadow-2xl ${
          entered ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
