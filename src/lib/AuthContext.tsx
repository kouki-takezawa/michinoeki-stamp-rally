import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabaseClient';

export interface SignUpResult {
  error: string | null;
  needsEmailConfirmation: boolean;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// SupabaseのPASSWORD_RECOVERYイベントは発火タイミングが不安定なことがあるため、
// リダイレクトURL自体(#...type=recovery)を直接見て判定する。こちらを正とする。
function isRecoveryRedirect(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(isRecoveryRedirect);

  useEffect(() => {
    if (isRecoveryRedirect()) {
      // URLに残ったトークンで判定を再利用しない・アドレスバーに残さないよう、読み取った直後に消す
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // サインアップ後に「Confirm email」設定がON/OFFのどちらでも正しく動くよう、
  // sessionが即座に発行されたか(=確認不要)を見て呼び出し側の表示を切り替える
  const signUp = async (email: string, password: string): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message, needsEmailConfirmation: false };
    return { error: null, needsEmailConfirmation: !data.session };
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const sendPasswordReset = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setIsPasswordRecovery(false);
    return { error: error?.message ?? null };
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        loading,
        isPasswordRecovery,
        signUp,
        signIn,
        sendPasswordReset,
        updatePassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
