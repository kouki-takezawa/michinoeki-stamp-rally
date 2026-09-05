import { useEffect, useRef, useState } from 'react';
import { getPhoto } from '../lib/photos';

interface Props {
  stationId: string;
  className?: string;
}

// モバイル10: 一覧・アルバムの写真は画面内に入るまでIndexedDBからの読み出し自体を遅延させる
// (loading="lazy"はネットワーク画像向けで、既にメモリ上にあるblob URLには効果がないため
//  IntersectionObserverで読み出しタイミング自体を制御する)
export function HistoryPhotoThumb({ stationId, className = 'h-10 w-10 shrink-0 rounded object-cover' }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const elRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    getPhoto(stationId).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [stationId, visible]);

  if (!url) return <div ref={elRef} className={className} aria-hidden="true" />;
  return <img src={url} alt="" className={className} />;
}
