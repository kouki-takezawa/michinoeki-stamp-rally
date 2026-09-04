import { useEffect, useState } from 'react';
import { getPhoto } from '../lib/photos';

interface Props {
  stationId: string;
  className?: string;
}

export function HistoryPhotoThumb({ stationId, className = 'h-10 w-10 shrink-0 rounded object-cover' }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
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
  }, [stationId]);

  if (!url) return null;
  return <img src={url} alt="" className={className} />;
}
