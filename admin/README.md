# 道の駅ラリー 管理画面 (admin)

`michinoeki-stamp-rally` 本体アプリとは別にデプロイする、管理者専用の管理画面。React (Vite) + Tailwind CSS + Supabase。本体アプリと同じSupabaseプロジェクト（同じユーザーDB）を参照するが、別オリジンの別アプリとしてデプロイされ、管理者以外はログインしても中身を閲覧できない。

## アクセス制御の仕組み

- service role key はどこにも置かない。ログインは本体アプリと同じ、通常のSupabase Auth（anon key）。
- 「管理者かどうか」は `public.profiles.is_admin` で管理する。
- ユーザー一覧・詳細取得・削除・権限変更などの管理操作はすべて `supabase/admin_schema.sql` で定義した SECURITY DEFINER の RPC関数経由でのみ行う。各関数は先頭で `is_admin(auth.uid())` を検査し、管理者以外は `forbidden` エラーになる。フロント側の表示切り替え（ログイン画面／アクセス拒否画面／管理画面）はUXのためのものであり、実際のアクセス制御はDB側のこのチェックが担う。
- 削除等の操作は `admin_audit_log` に記録され、「操作ログ」画面から確認できる。

## セットアップ（初回のみ）

1. 本体アプリの `supabase/schema.sql` が適用済みであること。
2. Supabaseダッシュボードの SQL Editor で `../supabase/admin_schema.sql` の内容を一度だけ実行する。
3. 管理者にしたいアカウントで、本体アプリまたはこの管理画面から一度サインアップ（またはログイン）してSupabase Auth上にユーザーを作る。
4. SQL Editor で最初の管理者を昇格させる（`admin_schema.sql` 末尾のコメントを参照）。
   ```sql
   update public.profiles set is_admin = true
     where id = (select id from auth.users where email = 'your-email@example.com');
   ```
5. 以降の管理者追加は、この管理画面の「ユーザー管理」画面から対象ユーザーを開き「管理者にする」を押すだけでよい（SQLを再実行する必要はない）。

## 開発

```bash
npm install
npm run dev
```

`.env.local` に本体アプリと同じ `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` を設定する（値そのものは公開情報であるanon keyなので、本体アプリの値をそのままコピーしてよい）。

## 主な機能

- **ユーザー管理**：全ユーザーの一覧・検索（表示名／メール／友達コード）、チェックイン数・お気に入り数の確認、ユーザー詳細（訪問履歴・友達数・共有設定）、表示名の変更、管理者権限の付与・剥奪、アカウント削除（確認ダイアログで表示名の入力が必須）
- **ダッシュボード**：総ユーザー数・総チェックイン数・総お気に入り数・直近7日/30日の新規登録数・保留中の友達申請数、人気の道の駅ランキング（チェックイン数トップ15）
- **操作ログ**：誰が・いつ・誰に対して・何をしたか（権限付与/剥奪・表示名変更・アカウント削除）の監査ログ

## デプロイ

本体アプリと同じGitHubリポジトリ内の `admin/` をルートディレクトリとする、別のVercelプロジェクトとしてデプロイする（`vercel link` 時に Root Directory を `admin` に設定）。環境変数 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` をVercel側にも設定すること。
