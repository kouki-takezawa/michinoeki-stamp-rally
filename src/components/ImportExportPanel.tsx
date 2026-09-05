import { useRef, useState } from 'react';
import { useToast } from '../lib/ToastContext';

interface Props {
  onExport: () => void;
  onImport: (file: File) => Promise<number>;
}

export function ImportExportPanel({ onExport, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { show } = useToast();
  const [dragOver, setDragOver] = useState(false);

  const runImport = async (file: File) => {
    try {
      await onImport(file);
    } catch (err) {
      show(err instanceof Error ? err.message : '取り込みに失敗しました', 'error');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await runImport(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type && file.type !== 'application/json' && !file.name.endsWith('.json')) {
      show('JSONファイルを指定してください', 'error');
      return;
    }
    await runImport(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-lg border p-4 transition-colors ${
        dragOver ? 'border-accent bg-accent-soft' : 'border-border bg-surface'
      }`}
    >
      <div className="mb-2 text-sm font-bold">機種変更に備えたバックアップ</div>
      <p className="mb-3 text-xs text-ink-muted">
        チェックイン履歴はこの端末のブラウザにのみ保存されます。JSONファイルとして書き出し・読み込みができます（PCでは書き出したファイルをこのカードにドラッグ＆ドロップしても読み込めます）。
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
      <p className="mt-3 text-[11px] text-ink-faint">
        インポートは既存の記録に追加でマージされます。同乗者が別の端末でエクスポートしたファイルを読み込めば、グループ全員分のチェックインを1つの記録にまとめられます。
      </p>
    </div>
  );
}
