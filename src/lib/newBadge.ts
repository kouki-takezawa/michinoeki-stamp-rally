const KEY_PREFIX = 'michinoeki-new-badge-first-seen:';
const VISIBLE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

// D14相当の発見性向上策：新機能に一定期間だけ「NEW」バッジを出す。初回アクセス日時を記録し、
// それから14日間だけ表示する（機能そのものの一部としては保存しない、あくまで表示可否の判定用）。
export function shouldShowNewBadge(featureKey: string): boolean {
  const key = KEY_PREFIX + featureKey;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, String(Date.now()));
      return true;
    }
    return Date.now() - Number(raw) < VISIBLE_WINDOW_MS;
  } catch {
    return false;
  }
}
