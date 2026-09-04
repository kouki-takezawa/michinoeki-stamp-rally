import { useEffect, useState } from 'react';
import { fetchCurrentWeather, type CurrentWeather } from '../lib/weather';

export function useWeather(lat: number, lng: number) {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setWeather(null);
    fetchCurrentWeather(lat, lng, controller.signal).then((w) => {
      if (!controller.signal.aborted) setWeather(w);
    });
    return () => controller.abort();
  }, [lat, lng]);

  return weather;
}
