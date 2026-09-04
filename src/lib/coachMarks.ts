const KEY_PREFIX = 'michinoeki-coachmark-seen:';

// 節目のタイミングで一度だけヒントを出すための既読フラグ管理
export function hasSeenCoachMark(key: string): boolean {
  try {
    return localStorage.getItem(KEY_PREFIX + key) === '1';
  } catch {
    return true;
  }
}

export function markCoachMarkSeen(key: string): void {
  try {
    localStorage.setItem(KEY_PREFIX + key, '1');
  } catch {
    // ignore
  }
}
