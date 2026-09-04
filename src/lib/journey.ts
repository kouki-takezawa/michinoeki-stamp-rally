import { profileScopedKey } from './profiles';

export interface Origin {
  lat: number;
  lng: number;
  label: string;
}

const BASE_KEY = 'michinoeki-origin-v1';

export function loadOrigin(): Origin | null {
  try {
    const raw = localStorage.getItem(profileScopedKey(BASE_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') {
      return { lat: parsed.lat, lng: parsed.lng, label: parsed.label ?? '出発地点' };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveOrigin(origin: Origin): void {
  try {
    localStorage.setItem(profileScopedKey(BASE_KEY), JSON.stringify(origin));
  } catch {
    // ignore
  }
}

export function clearOrigin(): void {
  try {
    localStorage.removeItem(profileScopedKey(BASE_KEY));
  } catch {
    // ignore
  }
}
