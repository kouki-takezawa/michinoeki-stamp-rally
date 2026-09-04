import type { Page } from '@playwright/test'

// .env.localのVITE_SUPABASE_URL(https://<ref>.supabase.co)から取得したプロジェクトref。
// supabase-jsはセッションを localStorage の `sb-<ref>-auth-token` キーに保存するため、
// テストではこのキーに偽のセッションを直接書き込んでログイン状態を再現する
// (実際のSupabaseにサインアップ/マジックリンクを送る必要がない)。
const PROJECT_REF = 'lkbjjhxqxsdlstpuzjue'
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`

function base64url(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url')
}

/**
 * ログイン済み状態を再現する。ページ遷移(goto)より前に呼ぶこと。
 * 本物のSupabaseへの書き込みを避けるため、呼び出し側で mockSupabaseNetwork も併用すること。
 */
export async function mockSignedIn(page: Page, opts: { id?: string; email?: string } = {}): Promise<void> {
  const userId = opts.id ?? '00000000-0000-4000-8000-000000000001'
  const email = opts.email ?? 'e2e-test@example.com'
  const nowSec = Math.floor(Date.now() / 1000)
  const expSec = nowSec + 60 * 60 * 24 * 365
  const fakeJwt = [
    base64url({ alg: 'HS256', typ: 'JWT' }),
    base64url({ sub: userId, email, exp: expSec, role: 'authenticated' }),
    'fakesignature',
  ].join('.')

  const session = {
    access_token: fakeJwt,
    token_type: 'bearer',
    expires_in: 60 * 60 * 24 * 365,
    expires_at: expSec,
    refresh_token: 'fake-refresh-token',
    user: {
      id: userId,
      email,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    },
  }

  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value)
    },
    { key: STORAGE_KEY, value: JSON.stringify(session) },
  )
}

/**
 * 本物のSupabaseプロジェクトに一切アクセスさせない(テストデータを本番DBに書き込まないため)。
 * 認証はlocalStorageに直接書き込んだ偽セッションで完結するので、通常のnearby/mypage画面の
 * 表示確認にはSupabaseへの実通信は不要。
 */
export async function blockSupabaseNetwork(page: Page): Promise<void> {
  await page.route('**/*.supabase.co/**', (route) => route.abort())
}
