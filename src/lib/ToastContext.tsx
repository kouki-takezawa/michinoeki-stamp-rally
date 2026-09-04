import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
  action?: ToastAction;
}

interface ToastOptions {
  tone?: ToastItem['tone'];
  action?: ToastAction;
}

interface ToastContextValue {
  show: (message: string, toneOrOptions?: ToastItem['tone'] | ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, toneOrOptions?: ToastItem['tone'] | ToastOptions) => {
    const options: ToastOptions =
      typeof toneOrOptions === 'string' ? { tone: toneOrOptions } : (toneOrOptions ?? {});
    const id = idRef.current++;
    setToasts((prev) => [...prev, { id, message, tone: options.tone ?? 'info', action: options.action }]);
    setTimeout(
      () => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      },
      options.action ? 5000 : 3200,
    );
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
        className="pointer-events-none fixed inset-x-0 bottom-14 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-bold shadow-lg ${
              t.tone === 'error'
                ? 'bg-red-700 text-white'
                : t.tone === 'success'
                  ? 'bg-accent text-white'
                  : 'bg-ink text-bg'
            }`}
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  setToasts((prev) => prev.filter((x) => x.id !== t.id));
                }}
                className="shrink-0 underline underline-offset-2"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
