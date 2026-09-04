import { useEffect, useRef, useState } from 'react';
import { deletePhoto, getPhoto, savePhoto } from '../lib/photos';

interface Props {
  stationId: string;
  onChange: (hasPhoto: boolean) => void;
}

export function PhotoPicker({ stationId, onChange }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPhoto(stationId).then((blob) => {
      if (cancelled) return;
      if (blob) {
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setPreviewUrl(url);
      }
    });
    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [stationId]);

  const handleFile = async (file: File) => {
    await savePhoto(stationId, file);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setPreviewUrl(url);
    onChange(true);
  };

  const handleRemove = async () => {
    await deletePhoto(stationId);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setPreviewUrl(null);
    onChange(false);
  };

  return (
    <div>
      {previewUrl ? (
        <div className="relative inline-block">
          <img src={previewUrl} alt="訪問時に添付した写真" className="h-24 w-24 rounded-lg object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            aria-label="写真を削除"
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-bg"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-dashed border-border px-3 py-2 text-xs font-bold text-ink-muted"
        >
          📷 思い出の写真を追加
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void handleFile(file);
        }}
      />
      <p className="mt-1 text-[11px] text-ink-faint">写真はこの端末にのみ保存されます（エクスポート対象外）</p>
    </div>
  );
}
