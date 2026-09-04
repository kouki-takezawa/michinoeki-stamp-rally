import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'michinoeki-install-dismissed-v1';

function loadDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(loadDismissed);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferred || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  return (
    <div className="mx-auto flex max-w-xl items-center justify-between gap-3 border-b border-border bg-accent-soft px-4 py-2.5 text-sm">
      <span className="text-accent">ホーム画面に追加すると次から早く開けます</span>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          }}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white"
        >
          追加する
        </button>
        <button type="button" onClick={dismiss} className="text-xs text-ink-faint underline">
          閉じる
        </button>
      </div>
    </div>
  );
}
