import { profileScopedKey } from './profiles';

export interface Goal {
  label: string;
  targetCount: number;
  targetDate?: string;
}

const BASE_KEY = 'michinoeki-goal-v1';

export function loadGoal(): Goal | null {
  try {
    const raw = localStorage.getItem(profileScopedKey(BASE_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.targetCount === 'number') return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveGoal(goal: Goal): void {
  try {
    localStorage.setItem(profileScopedKey(BASE_KEY), JSON.stringify(goal));
  } catch {
    // ignore
  }
}

export function clearGoal(): void {
  try {
    localStorage.removeItem(profileScopedKey(BASE_KEY));
  } catch {
    // ignore
  }
}
