import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';

type Mode = 'login' | 'signup' | 'forgot';

export function LoginScreen() {
  const { signUp, signIn, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const resetMessages = () => {
    setErrorMessage('');
    setInfoMessage('');
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    resetMessages();
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!email.trim()) return;

    if (mode === 'forgot') {
      setBusy(true);
      const { error } = await sendPasswordReset(email.trim());
      setBusy(false);
      if (error) setErrorMessage(error);
      else setInfoMessage('パスワード再設定用のリンクをメールで送りました。メール内のリンクを開いて新しいパスワードを設定してください。');
      return;
    }

    if (!password) return;

    if (mode === 'signup') {
      if (password.length < 6) {
        setErrorMessage('パスワードは6文字以上で入力してください');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('パスワードが一致しません');
        return;
      }
      setBusy(true);
      const result = await signUp(email.trim(), password);
      setBusy(false);
      if (result.error) {
        setErrorMessage(result.error);
      } else if (result.needsEmailConfirmation) {
        setInfoMessage('確認メールを送りました。メール内のリンクを開くと登録が完了します。');
      }
      // needsEmailConfirmationがfalseの場合は即ログイン状態になり、App側の画面へ自動遷移する
      return;
    }

    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) setErrorMessage(error);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-1 text-xs font-bold tracking-wide text-accent">道の駅ラリー</div>
        <h1 className="mb-4 text-xl font-black">
          {mode === 'login' ? 'ログイン' : mode === 'signup' ? '新規登録' : 'パスワードの再設定'}
        </h1>

        {!isSupabaseConfigured ? (
          <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            サーバー設定が見つかりません（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEYが未設定です）。開発者にご確認ください。
          </p>
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

            {mode !== 'forgot' && (
              <>
                <label className="mb-1 block text-xs font-bold text-ink-muted" htmlFor="login-password">
                  パスワード
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6文字以上"
                  className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
              </>
            )}

            {mode === 'signup' && (
              <>
                <label className="mb-1 block text-xs font-bold text-ink-muted" htmlFor="login-password-confirm">
                  パスワード（確認）
                </label>
                <input
                  id="login-password-confirm"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="もう一度入力"
                  className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
              </>
            )}

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="mb-3 block text-xs text-ink-faint underline"
              >
                パスワードを忘れた方はこちら
              </button>
            )}

            {errorMessage && <p className="mb-3 text-xs text-red-600">{errorMessage}</p>}
            {infoMessage && <p className="mb-3 text-xs text-accent">{infoMessage}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {busy
                ? '処理中…'
                : mode === 'login'
                  ? 'ログイン'
                  : mode === 'signup'
                    ? '登録する'
                    : 'リセットリンクを送る'}
            </button>

            <p className="mt-3 text-center text-[11px] text-ink-faint">
              {mode === 'login' ? (
                <>
                  アカウントをお持ちでない方は{' '}
                  <button type="button" onClick={() => switchMode('signup')} className="font-bold text-accent underline">
                    新規登録
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => switchMode('login')} className="font-bold text-accent underline">
                  ログイン画面に戻る
                </button>
              )}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
