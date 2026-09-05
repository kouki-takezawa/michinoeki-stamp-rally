import { useState } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  requireText?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  requireText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = Boolean(requireText) && input !== requireText;

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="mb-2 text-base font-bold text-stone-800">{title}</h2>
        <p className="mb-4 whitespace-pre-line text-sm text-stone-600">{message}</p>
        {requireText && (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={requireText}
            className="mb-4 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          />
        )}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-stone-600"
          >
            キャンセル
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={busy || locked}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 ${
              danger ? 'bg-red-600' : 'bg-emerald-700'
            }`}
          >
            {busy ? '処理中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
