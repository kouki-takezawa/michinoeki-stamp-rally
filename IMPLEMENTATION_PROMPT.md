# 道の駅スタンプラリー 拡張実装プロンプト

このファイルの内容をそのまま実装担当のAIに渡してください。42件の拡張案すべてを、依存関係を踏まえた順序で実装するための指示書です。

---

## あなたへの指示

あなたはこのリポジトリ(`apps/03-michinoeki-stamp-rally`)の実装を任されたエンジニアです。以下の仕様に従い、42件の拡張案を**フェーズ0→5の順に**実装してください。フェーズ1(採用確定の2件)が最優先です。各フェーズの区切りで動作確認・型チェック・lintを通し、コミットを分けてください。判断に迷う場合は「4. 実装前に整理した技術的制約」に書いた調整方針に従い、それでも判断できないものはコード内にTODOコメントを残して人間に確認を仰いでください。

---

## 1. 現状のアプリ概要(前提知識)

- **アプリ**: 現在地から近い道の駅を提案し、チェックインして「制覇率」を可視化するスタンプラリーPWA。全国1,231件の道の駅データを内蔵。
- **スタック**: React 19 + Vite 8 + TypeScript + Tailwind CSS 4 + Leaflet。`vite-plugin-pwa`でPWA化。lintは`oxlint`、e2eは`playwright`。
- **現状の設計思想**: **バックエンド・DBなし**。すべて`localStorage`/`IndexedDB`で完結(詳細は`README.md`の「ローカルストレージ・キー」参照)。
- **主要ファイル**(実装時に読むこと):
  - データ型: `src/lib/types.ts`(`Station`, `CheckinRecord`, `CheckinTag`, `CheckinExport` など)
  - チェックイン管理: `src/lib/storage.ts`, `src/hooks/useCheckins.ts`
  - 距離計算(直線距離): `src/lib/distance.ts`(Haversine実装済み。チェックイン可否判定の300m以内チェックに使用中)
  - テーマ管理: `src/lib/ThemeContext.tsx`(light/dark/systemの3択、`michinoeki-theme-v1`に保存)
  - お気に入り: `src/lib/favorites.ts`, `src/hooks/useFavorites.ts`
  - マイページ: `src/components/MyPage.tsx`、スタンプマップ: `src/components/StampMap/StampMapCanvas.tsx`
  - 既存のゲーミフィケーション: `src/lib/milestones.ts`, `src/lib/streak.ts`, `src/lib/roulette.ts`, `src/lib/celebrate.ts`
- **今回追加してよいもの**: **無料枠内であればDB・サーバーを追加してよい**(今回の変更点)。

実装前に必ず`README.md`と上記ファイルの現物を読み、命名規則・既存パターンに合わせること。

---

## 2. 今回追加する基盤技術

### 2-1. バックエンド: Supabase(無料プラン)

- Postgres DB・Auth・Storageを無料枠(DB 500MB、Storage 1GB、月間アクティブユーザー5万など)で利用する。
- `@supabase/supabase-js` を導入し、`src/lib/supabaseClient.ts` にクライアントを1つ作る。
- `.env.local` に `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` を追加(値はSupabaseプロジェクト作成後に発行される。既存の`.env.local`の内容は上書きせず追記すること)。

### 2-2. 匿名でも将来ログインに繋げられる認証: Supabase Anonymous Auth

ハンドロールのUUIDではなく、**Supabaseの匿名サインイン機能**(`supabase.auth.signInAnonymously()`)を使う。これは`auth.users`に`is_anonymous = true`の実レコードを作り、安定した`user_id`を発行する仕組みで、後から`linkIdentity`等で本アカウント化しても同じ`user_id`のままデータを引き継げる。これが「ログイン機能は今作らないが、将来の拡張を見据えた土台」の実体になる。

- `src/hooks/useAnonSession.ts` を新設。アプリ起動時に既存セッションを確認し、なければ`signInAnonymously()`を呼ぶ。
- 設定画面に「アカウントを作る(任意)」の導線をプレースホルダとして用意する(本実装では昇格処理のスタブ関数のみでよい。実際のOAuth接続は不要な要望が出てから)。
- すべてのRLS(Row Level Security)ポリシーは `auth.uid()` を基準に書く。

### 2-3. オフライン優先の原則

このアプリの価値の一つはPWAのオフライン動作。Supabase呼び出しは**すべて失敗を許容**し、オフライン時・API失敗時はローカルキャッシュや直線距離計算にフォールバックしてUIをブロックしないこと。

### 2-4. 追加要望(42件の一覧とは別枠。今回追加で対応する3件)

(a)(b)はSupabase整備を待たずに着手できる、フロントエンド完結のタスク。**Phase 0と並行して先に着手してよい。**(c)はSupabaseのEdge Function・DBを使うため、Phase 0(Supabaseプロジェクト作成)の後に着手する。

**(a) トップ画面の実写地図(MapView)の初期表示・都道府県ズーム**

- 現状: `MapView`(`src/components/MapView.tsx`)は`NearbyScreen.tsx`から常に`filteredStations`(検索語・都道府県・未訪問フィルタを適用済みの配列)を受け取って描画している。フィルタなしなら全国1,231件が表示されるが、都道府県で絞り込んでも**地図のパン・ズームは変わらず、マーカーが再描画されるだけ**(`MapView`内の`useEffect`は`stations`が変わっても`fitBounds`を呼んでいない)。
- 要望:
  1. 都道府県フィルタが未選択のデフォルト状態では、全国の道の駅がひと目で見える表示にする(現状維持でよいが、フィルタを解除したときも確実にこの状態に戻す)。
  2. 都道府県フィルタを選択したら、その都道府県の道の駅がすべて収まるように地図を自動でズームイン・パンする。
- 実装方針:
  - `NearbyScreen.tsx`で、`query`や`unvisitedOnly`の変化では発火せず、**`prefecture`が変わったときだけ**再計算される「その都道府県の全道の駅」を`useMemo`で用意する(`allStations.filter(s => prefecture ? s.prefecture === prefecture : true)`)。
  - `MapView`に`focusStations: Station[]`のようなpropを追加し、内部で`focusStations`(実質的には`prefecture`の値)が変わったときだけ`map.fitBounds(...)`を呼ぶ`useEffect`を新設する。未選択時は全国の`allStations`のboundsに、選択時はその都道府県のboundsにフィットさせる。`maxZoom`を指定し、道の駅が1件しかない県で過剰にズームしすぎないようにする(目安: 12前後)。
  - 既存の「現在地取得時に`flyTo`する」処理(`userLat`/`userLng`用の`useEffect`)とは独立させ、互いのタイミングで意図せず打ち消し合わないようにする。

**(b) 道の駅名の表記(漢字+フリガナ)**

- 現状: `src/data/michinoeki.json`の`name`は国交省データの原表記のまま(例: 漢字の「三笠」もあれば、「びふか」「南ふらの」のように**公式名称そのものがかな表記**のものも多く、読みではなく正式名称の一部)。
- 要望: 道の駅名を漢字表記にして、フリガナ(読み仮名)を付ける方式にしたい。
- 実装方針:
  1. `Station`型(`src/lib/types.ts`)に`nameKana?: string`を追加する。
  2. `scripts/convert-csv-to-json.mjs` → `add-facilities.mjs`に続く新スクリプト`scripts/add-furigana.mjs`を作り、`michinoeki.json`に`nameKana`を付与するバッチ処理を追加する。
  3. 読み仮名の自動生成には`kuroshiro` + `kuroshiro-analyzer-kuromoji`(無料・オフラインで動くJS製の形態素解析)を使い、漢字を含む名称にのみ読みを生成する。**地名の読みは自動解析だと誤りやすいため**、`scripts/furigana-overrides.csv`のような手動修正リストを用意し、既存の`michinoeki_master.csv`と同じ考え方で人手の修正を自動生成結果より優先させる。
  4. 表示側: 漢字を含む名称のときだけ`<ruby>{name}<rt>{nameKana}</rt></ruby>`でルビ表示し、名称が完全にかな・カタカナの場合はルビを付けない。共通の`StationName`コンポーネントを`src/components/`に新設し、`StationListItem.tsx`・`StationDetail.tsx`・`MapView.tsx`のツールチップ・`StampBook.tsx`・`HistoryTimeline.tsx`など駅名を表示する全箇所で使い回す。
  5. `SearchFilterBar`の検索条件を`s.name.includes(q) || s.nameKana?.includes(q)`に拡張し、読み仮名からも検索できるようにする。

**(c) 道の駅詳細ページに公式ページの画像を表示(なければ従来通り地図)**

- 要望: 各道の駅の詳細画面(`StationDetail.tsx`)で、`officialUrl`先の公式ページから代表画像を取得して表示する。`officialUrl`が無い駅(2018年度以降開業の約90件)は、現状通りLeafletミニマップ(`StationMap.tsx`)を表示する。**画像の取得に失敗した場合も同様に地図へフォールバックする。**
- 事前調査結果(重要): `officialUrl`はほぼすべて`https://www.michi-no-eki.jp/stations/view/<n>`という共通ポータル(道の駅公式ポータルサイト)を指しており、実際に取得して確認したところ**`og:image`/`twitter:image`のmetaタグは存在しない**。一方で、代表写真は必ず次のパターンのURLで配信されている(Drupalの画像スタイル):
  ```
  https://www.michi-no-eki.jp/sites/default/files/styles/stations_main/public/stations/<ID>.JPG?itok=<token>
  ```
  `itok`はページ側が発行するトークンで推測できないため、**IDから直接URLを組み立てることはできず、必ずページ本体のHTMLを取得してこのURLを抜き出す必要がある。**
- 実装方針:
  1. Supabaseにキャッシュ用テーブルを作成する(全ユーザーで共有する読み取り専用キャッシュ。一度解決した駅は再取得しない):
     ```sql
     create table public.station_og_images (
       station_id text primary key,
       image_url text,
       status text not null check (status in ('ok','not_found','error')),
       fetched_at timestamptz not null default now()
     );
     alter table public.station_og_images enable row level security;
     create policy "og_images_select_all" on public.station_og_images for select using (true);
     -- insert/update はservice_role(Edge Function側)のみ。anon keyからの書き込みは許可しない
     ```
  2. Supabase Edge Function `resolve-station-image` を作成する。入力: `stationId`, `officialUrl`。処理:
     - `officialUrl`のHTMLをサーバー側で`fetch`(タイムアウト5秒程度、通常のUser-Agentを付与)。
     - 正規表現等で`styles/stations_main/public/stations/`を含む`<img src="...">`を検索し、最初の1件を採用(相対パスなら`https://www.michi-no-eki.jp`を補って絶対URL化)。
     - 見つからない場合のフォールバックとして`og:image`/`twitter:image`のmetaタグも一応チェックする(ポータル以外のURLが混ざっていた場合の保険)。
     - どちらも見つからなければ`status: 'not_found'`。取得自体に失敗(タイムアウト・404等)したら`status: 'error'`。
     - 結果を`station_og_images`にupsertして返す。
  3. クライアント側: `officialUrl`が存在する駅のみ、まず`station_og_images`テーブルを直接SELECT(anon keyで読み取り可)してキャッシュを確認する。
     - 行が無ければ(=誰もまだ解決していない)ローディング表示をしつつ`resolve-station-image`を1回だけ呼び出し、結果に応じて画像 or 地図を表示する。
     - `status: 'ok'`ならその`image_url`を`<img loading="lazy">`で表示。`<img>`に`onError`ハンドラを付け、**表示自体に失敗したときも地図へフォールバック**する(サイト側のホットリンク制限等で読み込めないケースの保険)。
     - `status: 'not_found' / 'error'`なら地図を表示する(一定期間、例えば90日はキャッシュを信用して再取得しない)。
     - `officialUrl`が無い駅は、そもそもこのフローを通さず今まで通り即座に地図を表示する。
     - オフライン時はこのフロー自体をスキップし、常に地図にフォールバックする(オフライン優先の原則に従う)。
  4. 著作権・運用上の配慮: 画像はSupabase Storageに複製・保管せず、**公式サイトの画像URLをそのまま`<img>`で参照(ホットリンク)するだけ**にとどめる。取得するのはURL文字列のみで、画像バイナリ自体は自分たちのサーバーを経由しない。詳細画面には既存の「公式ページへのリンク」を画像の近くに残し、出典が分かるようにする。

---

## 3. 42件の対応表

| 区分 | 件数 | フェーズ |
|---|---|---|
| 採用確定(A1, A2) | 2 | Phase 1 |
| デザイン案(D01〜D20) | 20 | Phase 2, 3 |
| 機能提案(F01〜F20) | 20 | Phase 4, 5 |

---

## 4. 実装前に整理した技術的制約・スコープ調整

そのまま鵜呑みにすると矛盾したり、Web PWAの技術的限界を超える項目があったため、先に調整方針を決めている。実装時はこれに従うこと。

- **D06/D07/D08(御朱印帳スキン・道路標識モチーフ・産直市場カラー)は互いに排他な「配色案」であり、同時に採用できない。** → 3つとも切り捨てず、`ThemeContext`を「スキン(gosyuincho / roadsign / sanchoku)× 明暗(light/dark/system)× 季節演出(on/off)」の多軸設定に拡張し、設定画面でスキンを選べるようにする(=D06〜D10を1つの仕組みとして全部実装する)。
- **D20(ホーム画面ウィジェット)は、PWA単体ではOSネイティブのウィジェットを作れない。** → Web App Manifestの`shortcuts`とBadging API(対応ブラウザでアイコンに未訪問数バッジを出す)で代替する。ネイティブウィジェットが必須要件になった場合は別途Capacitor等でのネイティブラップが必要になる旨をREADMEに明記する。
- **F16(AIおすすめルート)は、実装コストと無料枠維持のため、外部LLM APIを呼ぶ実装にはしない。** → 設備タグの一致度・距離・過去のチェックインタグ傾向を使ったローカルの重み付けスコアリングで実現する。
- **F17(近接プッシュ通知)は、真のバックグラウンドPushにはサーバー(Supabase Edge Functions等)とiOSでの制約が絡む。** → MVPでは「アプリを開いている間の位置監視によるローカル通知」に限定する。バックグラウンドPushは将来拡張として明記するに留める。
- **F19(ヘルスケア連携)のうちApple Healthは、Webブラウザ/PWAからは技術的にアクセス不可(HealthKitはネイティブアプリ専用)。** → Google Fit REST API(OAuth)のみを対象とし、Apple Health対応は「ネイティブアプリ化しない限り不可」としてスコープ外にする。
- **F09/F10/F11/F12(フレンド機能・グループ合算・コラボアルバム・応援スタンプ)は、現状「チェックイン履歴は完全非公開」という前提を崩す。** → 位置情報を含む個人の移動履歴は機微情報のため、**共有は必ずオプトイン**にする(設定画面に「制覇状況をフレンドに共有する」等のトグルを用意し、デフォルトOFF)。F12(応援スタンプ)は個人のチェックインではなく、既に公開情報である口コミ(A2)へのリアクションとして実装し、プライバシーリスクを避ける。
- **A1の距離計算で使う無料ルーティングAPIは OpenRouteService(1日2,000リクエストまで無料、要APIキー登録)を第一候補とする。** オフライン時・上限到達時・API失敗時は既存の`src/lib/distance.ts`のHaversine直線距離に自動フォールバックし、UI上で「概算(直線距離)」と明示する。

---

## 5. フェーズ別タスク

### Phase 0 — 基盤整備

1. Supabaseプロジェクトを作成し、`@supabase/supabase-js`を導入。`src/lib/supabaseClient.ts`を作成。
2. `.env.local`に接続情報を追記。
3. Supabaseダッシュボードで Anonymous Sign-ins を有効化。
4. `src/hooks/useAnonSession.ts`を実装(起動時に匿名セッションを保証する)。
5. 設定画面に「アカウントを作る(任意)」のプレースホルダ導線を追加(スタブでよい)。

### Phase 0-B — 表示まわりの追加要望(Supabase整備と並行して着手可)

2-4節(a)(b)の2件を実装する。バックエンド不要なので、Phase 0と並行、あるいは先に着手してよい。

- (a) 都道府県フィルタ選択時に`MapView`をその都道府県へ自動ズーム、未選択時は全国表示をデフォルトにする。
- (b) `nameKana`をデータに付与し、漢字名にはルビでフリガナを表示。かな読みでの検索にも対応する。

### Phase 1 — 採用確定2件(最優先)

**A1: 出発地点 → 総距離・訪問日ログ**
- 出発地点の入力UI(現在地 / 地図タップ / 住所検索のいずれか。既存の`useGeolocation`・`MapView`を再利用)。出発地点は`michinoeki-origin-v1`として`localStorage`に保存。
- 距離計算はOpenRouteServiceで道路距離を取得し、失敗時は`distance.ts`のHaversineにフォールバック。station×origin単位で結果をローカルキャッシュし、再計算を避ける。
- マイページに「総距離」カードと、チェックイン日一覧を後から見返せるビュー(D04のカレンダー表示と統合してよい)を追加。

**A2: 口コミ機能**
- Supabaseにテーブルを作成(概略、実装時に調整可):

```sql
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  station_id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nickname text,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
create policy "reviews_select_all" on public.reviews for select using (true);
create policy "reviews_insert_own" on public.reviews for insert with check (auth.uid() = user_id);
create policy "reviews_delete_own" on public.reviews for delete using (auth.uid() = user_id);
create unique index reviews_one_per_station on public.reviews (station_id, user_id);

create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  reporter_user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.review_reports enable row level security;
create policy "reports_insert_any" on public.review_reports for insert with check (auth.uid() is not null);
```

- 投稿UI: 星評価(1〜5)+300字以内コメント+任意ニックネーム。ログイン不要(匿名セッションのuser_idで投稿)。1ユーザー1駅1件に制限(上記unique index)。
- 閲覧UI: `StationDetail`に「口コミ」タブを追加し新着順表示。平均評価を`StationListItem`・検索結果にも表示。
- モデレーション: 通報ボタン→`review_reports`に記録。一定数の通報が集まった口コミはクライアント側で非表示にする簡易フィルタ。
- オフライン時は「投稿はオンライン時のみ」と明示し、閲覧はキャッシュがあれば表示。

Phase 1完了時点で一度READMEを更新し、動作確認・コミットすること。

### Phase 2 — デザイン案(排他でない15件)

D01, D02, D03, D04, D05, D11, D12, D13, D14, D15, D16, D17, D18, D19, D20 を実装する(内容はデザイン一覧の該当項目を参照)。D20はBadging API + shortcutsで代替する(4章参照)。D11(アイソメトリック地図)は既存`StampMapCanvas`の描画方式を変える大きめの変更のため、他より後回しにしてよい。

### Phase 3 — デザイン案(視覚テーマの統合: D06〜D10)

`ThemeContext`を拡張し、スキン(gosyuincho/roadsign/sanchoku)×明暗×季節演出の多軸設定にする。各スキンはCSS変数セットとして定義。御朱印帳スキン選択時は既存のチェックイン時の判子演出を強調表示するなど、既存のゲーミフィケーション演出と噛み合わせる。

### Phase 4 — 機能提案(バックエンド不要: 12件)

F01, F02, F03, F04, F05, F06, F08, F13, F15, F18, F20 と、F16(ローカル重み付けスコアリング版)、F17(前景監視によるローカル通知版)を実装する。F15(道の駅グルメ図鑑)は既存の写真保存と同じくIndexedDBで個人記録として実装(共有はしない)。

### Phase 5 — 機能提案(バックエンド必要・プライバシー配慮あり: 6件)

F07(車中泊・駐車場情報共有)、F09(フレンド制覇率ランキング)、F10(グループ合算チェックイン)、F11(旅のコラボアルバム)、F12(応援スタンプ)、F14(期間限定イベントバッジ)。

- F07: `parking_notes`テーブル(station_id, user_id, is_flat, is_24h, note)。RLSはPhase1のreviewsと同様のパターン。
- F09: 個人のチェックイン履歴そのものは公開しない。設定でオプトインした場合のみ`public_stats`テーブル(user_id, total_checkins, prefecture_count, updated_at)へ集計値だけを送る。友人とはSupabaseで発行する招待コードで繋がる。
- F10: まずは既存の`mergeCheckins`(`src/lib/storage.ts`)を使ったJSON/QRコード経由のローカルマージで実現し、バックエンド不要で成立させる。リアルタイム合算が必要になった場合のみ、期限付きの共有部屋(`trip_rooms`)をSupabaseに追加する拡張案として残す。
- F11: Supabase Storageのバケットを使い、`trips`(共有コード発行)・`trip_photos`(storageパス参照)のテーブルを追加。
- F12: 個人のチェックインではなく、A2の口コミに対する軽いリアクション(`review_reactions`テーブル)として実装し、位置情報の公開範囲を広げない。
- F14: `events`テーブル(id, title, target_prefecture, starts_at, ends_at, badge_icon)を用意し、クライアントは読み取りのみ。管理はSupabaseダッシュボードから手動で行う想定(管理画面は作らない)。

---

## 6. 完了条件

- `npm run lint`(oxlint)・`tsc -b`・既存のPlaywrightテストが通ること。
- `README.md`を更新: 新しい`localStorage`キー、Supabaseのテーブル一覧、無料枠の上限(Supabase DB 500MB / Storage 1GB、OpenRouteService 1日2,000リクエストなど)を明記し、「Phase2(未実装・将来拡張)」節を今回実装した内容で更新する。
- フェーズごとに区切ってコミットする。
- 4章に書いた「実装しない/縮小した」項目(D20のネイティブウィジェット、F19のApple Health、F17のバックグラウンドPush、F16の外部LLM)は、README上でも「今回のスコープ外」として明記する。

---

## 7. 人気アプリ調査を踏まえた追加改善案(10件・G01〜G10)

実装前に、道の駅アプリの直接の競合と、ゲーミフィケーション/位置情報系で評価の高いアプリの現行UIを調査した。それぞれの参考元を明記する。42件の一覧を補強する位置づけで、既存のPhase 2〜5に組み込んで実装すること。

**直接競合の「みちめぐ」(全国1,228駅収録、都道府県制覇でオリジナルスタンプ、マップ表示、ランキング機能、トロフィー獲得システムを搭載)が既に存在する**ことを踏まえ、特にG01・G03は競合との機能差を埋める優先度の高い項目として扱う。

- **G01. 活動量が近いユーザー同士で競うリーグ制ランキング** — 参考: Duolingoのリーグ・マッチメイキング(似た活動量のユーザー同士を組み合わせ、勝てる見込みのある競争にすることで継続率を上げる仕組み)。F09(フレンド制覇率ランキング)を「友人限定」だけでなく、月間チェックイン数が近いユーザー同士を自動グルーピングする全国リーグ機能に拡張する。Phase 5に統合。
- **G02. ストリークの月1回「凍結」救済** — 参考: Duolingoのstreak freeze/streak repair(4.5倍の継続率向上効果が報告されている)。既存の連続チェックイン日数(`src/lib/streak.ts`)に、月1回まで「その日行けなくても記録が途切れない」救済枠を追加する。バックエンド不要、`michinoeki-checkins-v1`側のロジック変更のみ。Phase 4に追加。
- **G03. 年間ベスト記録カード** — 参考: Strava 2026年4月更新のAnnual Best Efforts。F03(年間振り返りレポート)を単発の年末サマリーで終わらせず、「1日最多チェックイン」「一番遠方への訪問」等を個別の自己ベストカードとして通年で随時更新表示する形に具体化する。Phase 4のF03実装に統合。
- **G04. 足あとルートの3Dフライオーバー演出** — 参考: Strava 2026年6月のFlyover animations(ルートを上空から飛行機視点でなぞる演出)。D13(足あとルートの映画的リプレイ)の演出仕様を、俯瞰视点での飛行アニメーションとして具体化する。Phase 2のD13実装に統合。
- **G05. 組み合わせ自由な「スタッツステッカー」シェア画像** — 参考: Strava 2026年のSticker stats(SNSシェア用に統計を貼り付けられるステッカー)。既存の達成シェア機能(`src/lib/share.ts`)を、距離・制覇県数・訪問日等を自由に組み合わせられるステッカー形式に拡張する。Phase 4に追加。
- **G06. 「あと◯件で制覇」カウントダウン表示** — 参考: 御朱印帳アプリの「残りの札所数がわかる」表示。現状の都道府県別制覇率(%)に加え、トップページや駅詳細に「あと3件で北海道制覇」のような具体的な件数を主要導線に出し、行動を後押しする。Phase 2に追加。
- **G07. 訪問マナー・豆知識の常設ミニコラム** — 参考: 御朱印帳アプリの参拝マナー解説コンテンツ。F13(ご当地クイズ)に加え、道の駅の楽しみ方や道路交通マナーの短い読み物を常設コンテンツとして追加し、アプリを開く理由を増やす。Phase 4に追加。
- **G08. コレクション種別を抽象化したデータモデル** — 参考: 「スマホ御朱印帳」が御朱印・御城印・御墳印・御空印など複数テーマを1つの帳面で横断的に扱っている点。今回は道の駅のみ実装するが、`CheckinRecord`等のスキーマ設計時に「コレクション種別」を将来追加できる形にしておき、サービスエリアやダムカード等への横展開を妨げないようにする。Phase 0の型設計で考慮。
- **G09. 小規模グループの「旅クラブ」共有導線** — 参考: Strava 2026年のClubsおよびアクティビティのプライベート/グループチャットへの直接共有。F10(グループ合算チェックイン)・F11(コラボアルバム)をまとめる形で、旅仲間内の小さな「クラブ」を作り、そこに訪問記録を直接共有できる導線を追加する。Phase 5のF10/F11実装に統合。
- **G10. チェックイン導線のライブ距離表示** — 参考: Strava 2026年のRedesigned Record Experience(移動中に地図と統計がリアルタイム連動)。目的の道の駅に近づくにつれて残り距離・徒歩時間がリアルタイムに更新される表示を`StationDetail`のチェックイン導線に追加し、到着に向けて数値が動く体験を作る。Phase 2に追加。

**出典**
- [みちめぐ - 日本全国道の駅巡りスタンプラリー(Google Play)](https://play.google.com/store/apps/details?id=michimegu.com&hl=en_US)
- [道の駅アプリのおすすめ6選(smartlog)](https://smartlog.jp/175056)
- [Strava Adds New Features for Hiking(Strava Press)](https://press.strava.com/articles/strava-adds-new-features-for-hiking-making-the-outdoor-experience-more-discoverable-navigable-and-social)
- [Strava's Latest Update Adds Annual Best Efforts(frontpacksports)](https://frontpacksports.com/strava-april-2026-update/)
- [Strava Launches Redesigned Record Experience(Strava Press)](https://press.strava.com/articles/strava-launches-redesigned-record-experience)
- [御朱印帳 No.1 15万件超の神社・お寺がいいねアプリ(App Store)](https://apps.apple.com/jp/app/%E5%BE%A1%E6%9C%B1%E5%8D%B0%E5%B8%B3-no-1-15%E4%B8%87%E4%BB%B6%E8%B6%85%E3%81%AE%E7%A5%9E%E7%A4%BE-%E3%81%8A%E5%AF%BA%E3%81%8C%E3%81%84%E3%81%84%E3%81%AD/id1480639171)
- [スマホ御朱印帳(Google Play)](https://play.google.com/store/apps/details?id=com.hiroshimamaful.sumaphogoshuinchou&hl=ja)
- [Apps That Use Streaks: 10 Real Examples Analysed(Trophy)](https://trophy.so/blog/streaks-feature-gamification-examples)

---

## 8. 追加改善案 第2弾(E/H/I) — 詳細仕様(2026-09-04 合意分)

Phase 0〜5、G01〜G10の実装が完了している前提で追加する改善案。**運用コストは無料枠に収めることを絶対条件**とする(Supabase Free Plan: DB 500MB / Storage 1GB / 月間アクティブユーザー5万 / Edge Function実行回数の上限内、Vercel等の無料枠ホスティング、追加の有料APIは導入しない)。新規テーブルはすべてRLSを有効化し、Phase 0で導入済みの匿名認証の`user_id`を主キーとする。オフライン優先の原則(サーバー呼び出し失敗時はローカルにフォールパック)も継続する。

| ID | 内容 | バックエンド | 備考 |
|---|---|---|---|
| E1 | 半日/日帰り周遊プラン自動提案 | 不要 | 前回提案10件中の5番 |
| E2 | 訪問時の簡易家計簿 | 不要 | 前回提案10件中の7番 |
| H01 | 公開シェアページ | 要(Supabase) | H02/H09の前提になる |
| H02 | OGP対応のリンクプレビュー | 要(Edge Function) | H01に依存 |
| H03 | 道の駅個別ページのSEO最適化 | 不要(ビルド時prerender) | |
| H04 | ワンタイム引き継ぎコード | 要(Supabase) | |
| H05 | Web Push通知 | 要(Supabase Edge Function) | iOSはホーム画面追加が必須 |
| H06 | Wake Lock API | 不要 | |
| H07 | Web Share Target API | 不要(manifest設定のみ) | Android系のみ対応 |
| H08 | 「今日の目的地」共有リンク | 不要 | |
| H09 | 埋め込み用制覇率バッジ | 要(Edge Function) | H01に依存 |
| H10 | File System Access APIバックアップ | 不要 | Chrome/Edge系のみ対応 |
| I1 | 友だち機能(制覇状況の相互閲覧) | 要(Supabase) | 新規・最重要 |

### E1. 半日/日帰り周遊プランの自動提案

- **目的**: 現在地・興味・可処分時間から、具体的な周遊プラン(3〜5駅)を1タップで提案する。
- **入力**: 現在地(`useGeolocation`)、出発可能時間(自由入力、デフォルト4時間)、興味カテゴリ(任意・複数選択: 温泉/グルメ/お土産/景色)。
- **処理フロー**:
  1. 現在地から半径Xkm(時間から平均巡航速度40km/hで逆算)以内の未訪問駅を候補抽出。
  2. 興味カテゴリが指定されていれば`recommend.ts`のスコアリングロジックを流用し、対応する`facilities`タグを優先。
  3. `useWeather.ts`で当日の天気を取得し、雨天なら屋内施設(レストラン・ショップ・美術館博物館)、晴天なら屋外施設(公園・展望台・キャンプ場)を優先する重み付けを追加。
  4. 上位候補3〜5駅を`routeOptimize.ts`の`optimizeRoute`で巡回順に並べる。
  5. 各区間の概算所要時間(`eta.ts`)を合計し、指定時間を超える場合は駅数を減らして再計算。
- **出力**: プラン名(例:「本日の半日温泉めぐりプラン」)、訪問順の駅リスト、合計移動時間の目安、Googleマップのマルチストップ経路リンク。
- **UI**: `NearbyScreen.tsx`または`MyPage.tsx`に「周遊プランを提案」ボタンを新設し、結果はモーダル表示。
- **注意**: 休業日・営業時間は考慮できない(既存の制約と同様)ことをUI上に明記する。

### E2. 訪問時の簡易家計簿

- **目的**: 道の駅での支出を記録し、年間の「道の駅への総支出」を振り返れるようにする。
- **型拡張**: `CheckinRecord`(`types.ts`)に`amountYen?: number`を追加。`GourmetNoteInput.tsx`に金額入力欄(数値・任意)を追加。
- **集計**: 新規`src/lib/spending.ts`に年間・月別・都道府県別の合計を計算する関数を追加(`progress.ts`と同じ集計パターン)。
- **表示**: `MyPage.tsx`に「今年の道の駅での支出」カードを追加(`AnnualReportCard.tsx`の実装パターンを踏襲)。グラフは`TagPieChart.tsx`と同様の軽量実装を流用。
- **エクスポート**: 既存のJSON export/importの対象に`amountYen`を含め、`CheckinExport`の`version`を上げる(未設定時は`undefined`として後方互換を保つ)。
- **データ/バックエンド**: 不要。localStorageのみ。
- **注意**: 家計簿としての精度は求めず、あくまで振り返り目的の簡易記録である旨をUIに明記(必須入力にしない)。

### H01. 公開シェアページ

- **目的**: アカウント登録・アプリインストールなしで、第三者が特定ユーザーの制覇状況を閲覧できるURLを発行する。
- **DBスキーマ**:

```sql
create table public.share_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  visible_scope text not null default 'prefecture_progress' check (visible_scope in ('prefecture_progress', 'station_list')),
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.share_profiles enable row level security;
create policy "share_profiles_select_if_enabled" on public.share_profiles for select using (is_enabled = true);
create policy "share_profiles_upsert_own" on public.share_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.share_conquests (
  user_id uuid not null references auth.users(id) on delete cascade,
  station_id text not null,
  checked_in_month text not null, -- 'YYYY-MM'のみ。日付までは公開しない
  primary key (user_id, station_id)
);
alter table public.share_conquests enable row level security;
create policy "share_conquests_select_if_owner_enabled" on public.share_conquests for select
  using (exists (select 1 from public.share_profiles p where p.user_id = share_conquests.user_id and p.is_enabled = true));
create policy "share_conquests_upsert_own" on public.share_conquests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- **フロー**: 設定画面で「公開ページを作る」をONにすると`share_profiles`にレコード作成、`id`から`/u/:id`のURLを発行。ONの間、チェックインのたびに`station_id`と月精度の`checked_in_month`のみを`share_conquests`に同期する(訪問日・写真・メモ・金額は一切送らない)。
- **表示範囲の選択**: `visible_scope`で「都道府県別の%のみ」か「訪問済み駅リストまで」かをユーザーが選べる。
- **ページ**: `/u/:id`は認証不要の公開ルート。`StampMapCanvas`を読み取り専用モードで表示する。
- **プライバシー注意**: デフォルトOFF。OFF時は`is_enabled=false`にするのみでよい(RLSでSELECT不可になるため実質非公開)。

### H02. OGP対応のリンクプレビュー

- **目的**: H01の公開ページや達成シェアのURLをSNSに貼った際にリッチな画像プレビューを出す。
- **実装方針**: Vercel Serverless/Edge Functionで`/api/og/:shareId`を作り、`@vercel/og`(無料OSS)で動的画像を生成。`/u/:id`の`<meta property="og:image">`にこのURLを指定する。
- **注意**: SPAのためOGPタグはリクエスト時にサーバー側で差し込む必要がある(クライアントのみの`<head>`書き換えはクローラーに反映されない)。Edge Middlewareで`/u/:id`アクセス時にOGPタグ入りの最小限HTMLを返す実装が必要。

### H03. 道の駅個別ページのSEO最適化

- **目的**: 検索エンジン経由の流入導線を作る。
- **実装方針**: Viteのprerenderプラグイン(無料OSS)でビルド時に全1,231駅の詳細ページを静的HTML化。駅名・都道府県・設備を含む`<title>`/`<meta description>`を設定する。
- **注意**: SPA全体をSSR化する必要はなく、駅詳細ページのみの部分的プリレンダーで足りる。

### H04. ワンタイム引き継ぎコード

- **DBスキーマ**:

```sql
create table public.transfer_codes (
  code text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  used boolean not null default false
);
alter table public.transfer_codes enable row level security;
create policy "transfer_codes_insert_any" on public.transfer_codes for insert with check (true);
create policy "transfer_codes_select_any" on public.transfer_codes for select using (true);
```

- **フロー**: 旧端末で「引き継ぎコードを発行」→ローカルの`CheckinExport`相当のJSONを`payload`として保存し、コード(QR表示も併用)を表示。新端末でコード入力→`payload`を取得し既存の`mergeCheckins`(`storage.ts`)でマージ→`used=true`に更新。
- **注意**: `payload`に個人データが入るため、コードは英数字8桁など十分なエントロピーを持たせ、有効期限(30分)を短くしてリスクを抑える。

### H05. Web Push通知

- **目的**: F17で見送った「アプリを閉じていても届く近接通知」を、iOS 16.4以降のホーム画面PWAでも動く正式なWeb Push規格で実現する。
- **実装方針**:
  1. VAPID鍵ペアを生成(`web-push`パッケージ、無料・自己ホスト)。
  2. Service Worker(`vite-plugin-pwa`設定)に`push`イベントハンドラを追加。
  3. クライアントで`pushManager.subscribe()`し、Subscription情報を`push_subscriptions`に保存。
  4. 通知トリガーは「アプリを開いたときにバックグラウンドで最寄りの未訪問駅との距離を計算し、一定距離以内ならSupabase Edge Functionを呼んでプッシュを送る」程度に留める(継続的な位置監視はブラウザからはできないため、F17と同じく「アプリを開いている間」が起点になる制約は残るが、通知の着信自体はアプリを閉じた後も届く点がF17との違い)。
- **DBスキーマ**:

```sql
create table public.push_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text primary key,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions_own" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- **注意**: iOSはホーム画面に追加していないと通知許可自体を出せない。「ホーム画面に追加してから通知を有効にできます」と案内する。

### H06. Wake Lock API

- **実装方針**: `navigator.wakeLock.request('screen')`を地図表示中(`MapView`/`StampMap`)にトリガーし、非表示になったら`release()`する。設定でON/OFFを切り替え可能にする(バッテリー消費への配慮)。
- **データ/バックエンド**: 不要。

### H07. Web Share Target API

- **実装方針**: `manifest.webmanifest`(`vite-plugin-pwa`設定)に`share_target`を追加する。

```json
"share_target": {
  "action": "/share-target",
  "method": "GET",
  "params": { "title": "title", "text": "text", "url": "url" }
}
```

- `/share-target`ルートで受け取ったURL/テキストから道の駅名らしき文字列を検索し、候補があれば詳細画面へ誘導。マッチしなければトップ画面にフォールバック。
- **対応状況**: Android Chrome系のみ。iOSは非対応と明記する。

### H08. 「今日の目的地」共有リンク

- **実装方針**: `roulette.ts`の抽選結果の`stationId`をURLクエリ(`?dest=<stationId>`)化する共有ボタンを追加。リンクを開くとその駅の詳細画面に直接遷移し、「◯◯さんからのおすすめ」の文言を表示する。
- **データ/バックエンド**: 不要(URLパラメータのみ)。

### H09. 埋め込み用の制覇率バッジ

- **実装方針**: 公開Edge Function`/api/badge/:shareId.svg`で、H01の`share_profiles`(`is_enabled=true`)を参照し、「制覇率24%」のようなSVGバッジ画像を動的生成して返す。`<img src="https://.../api/badge/xxx.svg">`をブログ等に貼れるようにする。
- **データ/バックエンド**: H01のテーブルを再利用。追加のDBは不要。

### H10. File System Access APIによる自動バックアップ

- **実装方針**: 対応ブラウザ(Chrome/Edge)では`window.showSaveFilePicker()`で保存先ファイルハンドルを取得し、`FileSystemFileHandle`を保持。以後のエクスポートは確認なしで同じファイルに上書き保存する。非対応ブラウザ(Safari/Firefox)は既存の都度ダウンロード方式にフォールバックする。
- **データ/バックエンド**: 不要(完全にクライアント内)。

### I1. 友だち機能(制覇状況の相互閲覧)【新規・最重要】

- **目的**: 招待した/された「友だち」同士で、互いにどの道の駅を制覇したかを確認できるようにする。
- **前提となる方針判断**(実装前に確定させる):
  - 4章の既存方針「個人のチェックイン履歴は完全非公開がデフォルト」を継続し、友だち機能も明示的なオプトインを要求する。
  - 共有する粒度は**訪問済みの駅IDまで**とし、訪問日時・メモ・写真・金額(E2)は共有しない。位置情報を含む行動履歴は機微情報であり、必要最小限に絞ってリスクを抑える。
  - 友だち関係は**双方向の相互承認**とする(SNS的な一方的フォローにはしない。招待した側・された側の両方が同意した関係のみ成立させる)。
- **データモデル**:

```sql
-- 招待コード
create table public.friend_invites (
  code text primary key,
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid references auth.users(id)
);
alter table public.friend_invites enable row level security;
create policy "friend_invites_insert_own" on public.friend_invites for insert with check (auth.uid() = inviter_user_id);
create policy "friend_invites_select_any" on public.friend_invites for select using (true);
-- 更新(消費)はEdge Function(service_role)経由のみ許可し、anon keyからの直接updateは許可しない

-- 友だち関係(相互1レコード。user_id_a < user_id_bで正規化し重複を防ぐ)
create table public.friendships (
  user_id_a uuid not null references auth.users(id) on delete cascade,
  user_id_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id_a, user_id_b),
  check (user_id_a < user_id_b)
);
alter table public.friendships enable row level security;
create policy "friendships_select_own" on public.friendships for select
  using (auth.uid() = user_id_a or auth.uid() = user_id_b);
-- insert/deleteはEdge Function(service_role)経由のみ許可し、招待コード消費と同時にトランザクションで作成する

-- 制覇状況の共有(H01のshare_conquestsとは公開範囲が異なる=友だちのみのため別テーブルとして分離)
create table public.friend_visible_conquests (
  user_id uuid not null references auth.users(id) on delete cascade,
  station_id text not null,
  primary key (user_id, station_id)
);
alter table public.friend_visible_conquests enable row level security;
create policy "friend_visible_conquests_select_friends" on public.friend_visible_conquests for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where (f.user_id_a = auth.uid() and f.user_id_b = friend_visible_conquests.user_id)
         or (f.user_id_b = auth.uid() and f.user_id_a = friend_visible_conquests.user_id)
    )
  );
create policy "friend_visible_conquests_upsert_own" on public.friend_visible_conquests for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 友だち機能全体のON/OFFと表示名
create table public.friend_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  sharing_enabled boolean not null default false
);
alter table public.friend_settings enable row level security;
create policy "friend_settings_select_self_or_friends" on public.friend_settings for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where (f.user_id_a = auth.uid() and f.user_id_b = friend_settings.user_id)
         or (f.user_id_b = auth.uid() and f.user_id_a = friend_settings.user_id)
    )
  );
create policy "friend_settings_upsert_own" on public.friend_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- **友だち追加フロー**:
  1. 設定画面「友だち」タブで「招待コードを発行」→`friend_invites`に自分のuser_idで1行作成、英数字コードを表示(QRコード化はH04の表示部品を流用)。
  2. 相手が「コードを入力して友だちになる」→Supabase Edge Function `accept-friend-invite`を呼ぶ(anon keyからの直接insert/updateを禁止しているため)。Functionはコードを検証(未使用・期限内)し、`used_by`を更新すると同時に`friendships`へ`(min(uid1,uid2), max(uid1,uid2))`で1行作成する。
  3. 双方に「友だちになりました」を通知(トースト、次回起動時でよい)。
- **同期フロー**:
  - `friend_settings.sharing_enabled`をデフォルトOFFで用意。ONにして初めて、以後のチェックインが`friend_visible_conquests`に同期される(オフライン時は失敗を許容し、次回オンライン時に差分同期)。
  - OFFにした場合は新規同期を止めるのみとし、既存行の即時削除は行わない(必要なら「友だちとの共有データを削除」操作を別途用意する)。
- **UI**:
  - `MyPage.tsx`に「友だち」タブを新設。友だち一覧(ニックネーム・全国制覇率のみのサマリー)を表示。
  - 友だちを選ぶと、その人の訪問済み駅をスタンプマップ上に別色でオーバーレイ表示(自分=金、友だち=青、など)。`StampMapCanvas.tsx`に「比較対象の駅IDセット」を渡せるようpropsを拡張する。
  - 「自分だけが訪問済み」「友だちだけが訪問済み」「二人とも訪問済み」を色分けし、「二人でここに行こう」を誘発する見せ方にする。
  - 友だち解除ボタン(`friendships`から該当行を削除。Edge Function経由)。
- **プライバシー上の必須要件**:
  - 初回ON時に「友だちには訪問した道の駅の一覧が見えるようになります(訪問日時・写真・メモ・金額は見えません)」という説明モーダルを必ず表示し、同意した場合のみONにする。
  - 友だち関係はいつでも即座に解消可能で、解消後は相手から`friend_visible_conquests`が見えなくなる(RLSで自動的に保証される)。
  - README・オンボーディングの「チェックイン履歴は完全非公開」という既存の説明を、この機能追加に合わせて更新する。

---

## 9. Phase 6 タスク分割

- **Phase 6-A(バックエンド不要、先行着手可)**: E1, E2, H06, H07, H08, H10
- **Phase 6-B(公開ページ基盤)**: H01 → H02, H09(いずれもH01に依存するため後続)
- **Phase 6-C(SEO、独立)**: H03
- **Phase 6-D(データ移行系)**: H04
- **Phase 6-E(Push、独立)**: H05
- **Phase 6-F(友だち機能、規模が大きいため最後)**: I1

## 10. Phase 6 完了条件

- 既存の完了条件(6章: `npm run lint`・`tsc -b`・Playwrightテスト・README更新・フェーズごとのコミット)を踏襲する。
- 追加した各Supabaseテーブルは、RLSが有効化されていること、および他ユーザーの行が見えないことを実際に別アカウントで確認する。
- 同期するデータが必要最小限(station_idのみ等)に絞られていることをレビューで確認し、無料枠(DB 500MB / Storage 1GB / MAU 5万 / Edge Function実行回数)を圧迫しないようにする。
- I1(友だち機能)は、オプトイン説明モーダルの実装と、RLSポリシーのテスト(友だちでない相手からデータが見えないことの確認)を完了条件に含める。
- README「Phase2(未実装・将来拡張)」節を今回実装した内容で更新する。
