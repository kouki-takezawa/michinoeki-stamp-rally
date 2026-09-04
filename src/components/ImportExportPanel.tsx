import { useRef } from 'react';
import { useToast } from '../lib/ToastContext';

interface Props {
  onExport: () => void;
  onImport: (file: File) => Promise<number>;
}

export function ImportExportPanel({ onExport, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { show } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await onImport(file);
    } catch (err) {
      show(err instanceof Error ? err.message : '取り込みに失敗しました', 'error');
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 text-sm font-bold">機種変更に備えたバックアップ</div>
      <p className="mb-3 text-xs text-ink-muted">
        チェックイン履歴はこの端末のブラウザにのみ保存されます。JSONファイルとして書き出し・読み込みができます。
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onExport}
          className="flex-1 rounded-lg border border-border bg-surface-2 py-2 text-sm font-bold hover:bg-border"
        >
          エクスポート
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 rounded-lg border border-border bg-surface-2 py-2 text-sm font-bold hover:bg-border"
        >
          インポート
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
