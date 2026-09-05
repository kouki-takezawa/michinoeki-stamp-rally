import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が設定されていません。');
}

export const supabase = createClient(
  url || 'https://placeholder.invalid',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      // 本番アプリ(michinoeki-stamp-rally)とはoriginが異なるため、
      // localStorageは自然に分離される(セッションを共有する必要はない)。
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
