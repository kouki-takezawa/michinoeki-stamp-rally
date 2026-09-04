import { profileScopedKey } from './profiles';

const SEARCH_KEY = 'michinoeki-recent-searches-v1';
const STATION_KEY = 'michinoeki-recent-stations-v1';
const MAX_ITEMS = 5;

function loadList(base: string): string[] {
  try {
    const raw = localStorage.getItem(profileScopedKey(base));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function saveList(base: string, list: string[]): void {
  try {
    localStorage.setItem(profileScopedKey(base), JSON.stringify(list));
  } catch {
    // ignore
  }
}

function pushRecent(base: string, value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return loadList(base);
  const current = loadList(base).filter((v) => v !== trimmed);
  const next = [trimmed, ...current].slice(0, MAX_ITEMS);
  saveList(base, next);
  return next;
}

export function loadRecentSearches(): string[] {
  return loadList(SEARCH_KEY);
}

export function recordRecentSearch(term: string): string[] {
  return pushRecent(SEARCH_KEY, term);
}

export function loadRecentStationIds(): string[] {
  return loadList(STATION_KEY);
}

export function recordRecentStation(stationId: string): string[] {
  return pushRecent(STATION_KEY, stationId);
}
