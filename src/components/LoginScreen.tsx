import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';

export function LoginScreen() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    const { error } = await signInWithEmail(email.trim());
    if (error) {
      setErrorMessage(error);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-1 text-xs font-bold tracking-wide text-accent">道の駅ラリー</div>
        <h1 className="mb-4 text-xl font-black">ログイン</h1>

        {!isSupabaseConfigured ? (
          <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            サーバー設定が見つかりません（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEYが未設定です）。開発者にご確認ください。
          </p>
        ) : status === 'sent' ? (
          <div className="rounded-lg bg-accent-soft p-4 text-sm text-accent">
            <p className="font-bold">メールを送信しました</p>
            <p className="mt-1 text-ink-muted">
              {email} 宛にログイン用リンクを送りました。メール内のリンクを開くとログインできます。
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mb-1 block text-xs font-bold text-ink-muted" htmlFor="login-email">
              メールアドレス
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            {status === 'error' && <p className="mb-3 text-xs text-red-600">{errorMessage}</p>}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {status === 'sending' ? '送信中…' : 'ログインリンクを送る'}
            </button>
            <p className="mt-3 text-[11px] text-ink-faint">
              パスワードは不要です。入力したメールアドレスにログイン用のリンクが届きます。
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
