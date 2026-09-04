const STORAGE_KEY = 'michinoeki-favorites-v1';

export function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((v): v is string => typeof v === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    console.error('お気に入りの保存に失敗しました');
  }
}

export function toggleFavorite(stationId: string): Set<string> {
  const current = loadFavorites();
  if (current.has(stationId)) {
    current.delete(stationId);
  } else {
    current.add(stationId);
  }
  saveFavorites(current);
  return current;
}

export function mergeFavorites(incoming: string[]): Set<string> {
  const current = loadFavorites();
  for (const id of incoming) current.add(id);
  saveFavorites(current);
  return current;
}
