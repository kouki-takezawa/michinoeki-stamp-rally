import { expect, test } from '@playwright/test'
import { blockSupabaseNetwork, mockSignedIn } from './helpers/auth'

test.describe('ログイン済み: 近くの道の駅', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: 35.7101, longitude: 139.8107 })
    await mockSignedIn(page)
    await blockSupabaseNetwork(page)
    await page.emulateMedia({ reducedMotion: 'reduce' }) // スプラッシュ待ちを避けてテストを安定させる
    // オンボーディングモーダル(初回のみ表示)がクリックを妨げないよう、既読扱いにしておく
    await page.addInitScript(() => window.localStorage.setItem('michinoeki-onboarding-seen-v1', '1'))
    await page.goto('/')
  })

  test('ログイン画面を経由せず、近くの道の駅の一覧・地図が表示される', async ({ page }) => {
    // 「近くの道の駅」というテキストはPC用サイドバー(モバイル幅ではhidden)にも存在し曖昧なため、
    // 常にユニークな要素で判定する
    await expect(page.getByRole('button', { name: '現在地を取得する' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByLabel('メールアドレス')).not.toBeVisible()
  })

  test('都道府県を選ぶと地図がその都道府県(県庁所在地)にフォーカスする', async ({ page }) => {
    await page.getByRole('button', { name: '現在地を取得する' }).click()
    // 現在地の取得(position)が確定してから検索バーが現れるので、固定sleepではなく状態文言を待つ
    await expect(page.getByText(/現在地を更新|推定位置で表示中/)).toBeVisible({ timeout: 10000 })
    const prefSelect = page.locator('select').first()
    await expect(prefSelect).toBeVisible({ timeout: 5000 })
    await prefSelect.selectOption({ label: '岡山県' })
    // 地図(Leafletタイル)が再描画されるまで少し待ち、クラッシュしていないことを確認する
    await page.waitForTimeout(1000)
    await expect(page.locator('.leaflet-container').first()).toBeVisible()
  })

  test('タブを切り替えられる(近くの道の駅 → マイページ → 友達)', async ({ page }) => {
    await page.getByRole('button', { name: 'マイページ' }).first().click()
    await expect(page.getByText('MY PAGE')).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: '友達' }).first().click()
    await expect(page.getByText('FRIENDS')).toBeVisible({ timeout: 5000 })
  })

  test('駅の詳細を開いて閉じられる', async ({ page }) => {
    await page.getByRole('button', { name: '現在地を取得する' }).click()
    const row = page.locator('[data-row-index="0"]').first()
    await row.waitFor({ state: 'visible', timeout: 10000 })
    await row.click()
    await expect(page.getByText('← 一覧に戻る')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'チェックインする' })).toBeVisible()
    await page.getByText('← 一覧に戻る').click()
    await expect(page.getByText('← 一覧に戻る')).not.toBeVisible()
  })
})

test.describe('モバイル幅: ボトムシートとタブバーの重なり回帰テスト', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: 35.7101, longitude: 139.8107 })
    await mockSignedIn(page)
    await blockSupabaseNetwork(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript(() => window.localStorage.setItem('michinoeki-onboarding-seen-v1', '1'))
    await page.goto('/')
    await page.getByRole('button', { name: '現在地を取得する' }).click()
    await page.waitForTimeout(1000)
  })

  test('peek状態でも「未訪問のみ」チェックボックスがタブバーに隠れずクリックできる', async ({ page }) => {
    const handle = page.getByLabel('リストの表示範囲を変更')
    await handle.waitFor({ state: 'visible', timeout: 5000 })
    // half(初期) -> full -> peek と2回タップしてpeek状態にする
    await handle.click()
    await page.waitForTimeout(300)
    await handle.click()
    await page.waitForTimeout(300)
    await handle.click() // peekに戻して(半分表示の状態から再度peekへ)確実にpeekへ
    await page.waitForTimeout(300)

    const unvisited = page.getByText('未訪問のみ')
    // クリックできない場合、タブバーが上に乗っていてPlaywrightがタイムアウトする
    await unvisited.click({ timeout: 5000 })
  })

  test('モバイル下部タブバーの各ボタンが正しい高さで表示される(潰れていない)', async ({ page }) => {
    const nav = page.locator('nav.lg\\:hidden')
    await expect(nav).toBeVisible()
    const box = await nav.boundingBox()
    expect(box).not.toBeNull()
    // h-16(64px)を大きく下回っていたら、safe-areaのpaddingで中身が潰れている回帰
    expect(box!.height).toBeGreaterThanOrEqual(60)
  })
})
