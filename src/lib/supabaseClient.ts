import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEYが無い環境(.env.localを持たないfork/clone等)でも
// アプリ全体がクラッシュしないよう、ダミー値でクライアントを作る。ログイン・友達機能は
// エラーを返すだけになるが、それ以外(近くの道の駅を探す等)は引き続き使える。
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  url || 'https://placeholder.invalid',
  anonKey || 'placeholder-anon-key',
);
