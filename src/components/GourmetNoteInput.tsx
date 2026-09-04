import { useEffect, useState } from 'react';
import { getGourmetNote, saveGourmetNote } from '../lib/gourmet';

interface Props {
  stationId: string;
}

export function GourmetNoteInput({ stationId }: Props) {
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setNote('');
    setSaved(false);
    getGourmetNote(stationId).then((entry) => {
      if (!cancelled && entry) {
        setNote(entry.note);
        setSaved(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [stationId]);

  const handleSave = async () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    await saveGourmetNote(stationId, trimmed);
    setSaved(true);
  };

  return (
    <div>
      <div className="mb-2 text-sm font-bold">🍴 ご当地グルメメモ</div>
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaved(false);
        }}
        onBlur={handleSave}
        placeholder="食べたものや感想を記録しておくと、マイページの図鑑に残ります"
        rows={2}
        maxLength={200}
        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
      {saved && note.trim() && <p className="mt-1 text-[11px] text-accent">✓ 保存済み</p>}
    </div>
  );
}
