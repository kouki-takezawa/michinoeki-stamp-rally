import { useCallback, useState } from 'react';
import { loadFavorites, toggleFavorite } from '../lib/favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());

  const toggle = useCallback((stationId: string) => {
    setFavorites(toggleFavorite(stationId));
  }, []);

  return { favorites, toggle };
}
