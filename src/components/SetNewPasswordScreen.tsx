import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

export function SetNewPasswordScreen() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (password.length < 6) {
      setErrorMessage('パスワードは6文字以上で入力してください');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('パスワードが一致しません');
      return;
    }
    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) setErrorMessage(error);
    else setDone(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-1 text-xs font-bold tracking-wide text-accent">道の駅ラリー</div>
        <h1 className="mb-4 text-xl font-black">新しいパスワードの設定</h1>

        {done ? (
          <p className="rounded-lg bg-accent-soft p-4 text-sm text-accent">
            パスワードを更新しました。続けてアプリをご利用いただけます。
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mb-1 block text-xs font-bold text-ink-muted" htmlFor="new-password">
              新しいパスワード
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            <label className="mb-1 block text-xs font-bold text-ink-muted" htmlFor="new-password-confirm">
              新しいパスワード（確認）
            </label>
            <input
              id="new-password-confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="もう一度入力"
              className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            {errorMessage && <p className="mb-3 text-xs text-red-600">{errorMessage}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? '更新中…' : 'パスワードを更新する'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
