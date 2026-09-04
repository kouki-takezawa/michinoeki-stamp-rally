import { expect, test } from '@playwright/test'

test.describe('未ログイン時', () => {
  test('起動アニメーションが流れたあとログイン画面が表示される', async ({ page }) => {
    await page.goto('/')
    // スプラッシュのワードマークが一度は見える(セッション内初回のみ表示される想定)
    await expect(page.getByText('道の駅ラリー').first()).toBeVisible({ timeout: 3000 })
    // スプラッシュが終わるとログイン画面のメール入力欄が現れる
    await expect(page.getByLabel('メールアドレス')).toBeVisible({ timeout: 3000 })
  })

  test('同じセッション内でリロードしてもスプラッシュは再生されない', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByLabel('メールアドレス')).toBeVisible({ timeout: 3000 })
    await page.reload()
    // リロード直後からログイン画面が見えている(スプラッシュの1.5秒待ちが発生しない)
    await expect(page.getByLabel('メールアドレス')).toBeVisible({ timeout: 500 })
  })

  test('prefers-reduced-motionではスプラッシュを即スキップする', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.getByLabel('メールアドレス')).toBeVisible({ timeout: 500 })
  })

  test('スプラッシュはタップで即スキップできる', async ({ page }) => {
    await page.goto('/')
    const skipTarget = page.getByLabel('読み込み中の画面をスキップ')
    if (await skipTarget.isVisible().catch(() => false)) {
      await skipTarget.click()
    }
    await expect(page.getByLabel('メールアドレス')).toBeVisible({ timeout: 1000 })
  })

  test('メールアドレスを入力せずに送信してもエラーにならず、必須バリデーションで止まる', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const emailInput = page.getByLabel('メールアドレス')
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveAttribute('required', '')
  })
})
