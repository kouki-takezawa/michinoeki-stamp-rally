import { useState } from 'react';
import { buildShareCanvas } from '../lib/share';
import { shareImage } from '../lib/share';
import { useToast } from '../lib/ToastContext';

interface Props {
  headline: string;
  subline: string;
  statLabel: string;
  statValue: string;
  shareText: string;
  className?: string;
  label?: string;
}

export function ShareButton({ headline, subline, statLabel, statValue, shareText, className, label }: Props) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  const handleShare = async () => {
    setBusy(true);
    try {
      const canvas = buildShareCanvas({ headline, subline, statLabel, statValue });
      const result = await shareImage(canvas, shareText);
      if (result === 'downloaded') {
        show('画像を保存しました。投稿画面に添付してください', 'success');
      }
    } catch {
      show('シェア画像の作成に失敗しました', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={busy}
      className={
        className ??
        'rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60'
      }
    >
      {busy ? '作成中…' : (label ?? 'シェアする')}
    </button>
  );
}
