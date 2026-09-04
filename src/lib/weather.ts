// F05: Open-Meteo（APIキー不要・CORS対応）を使った現在地の簡易天気表示
export interface CurrentWeather {
  temperatureC: number;
  weatherCode: number;
  isRain: boolean;
}

// WMO Weather interpretation codes (Open-Meteoドキュメント準拠)
const WEATHER_EMOJI: Record<number, string> = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  45: '🌫️',
  48: '🌫️',
  51: '🌦️',
  53: '🌦️',
  55: '🌦️',
  61: '🌧️',
  63: '🌧️',
  65: '🌧️',
  71: '🌨️',
  73: '🌨️',
  75: '🌨️',
  80: '🌦️',
  81: '🌧️',
  82: '⛈️',
  95: '⛈️',
  96: '⛈️',
  99: '⛈️',
};

const RAIN_CODES = new Set([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99]);

export function weatherEmoji(code: number): string {
  return WEATHER_EMOJI[code] ?? '🌡️';
}

export async function fetchCurrentWeather(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<CurrentWeather | null> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: 'temperature_2m,weather_code',
    timezone: 'Asia/Tokyo',
  });
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    const code = data?.current?.weather_code;
    const temp = data?.current?.temperature_2m;
    if (typeof code !== 'number' || typeof temp !== 'number') return null;
    return { temperatureC: temp, weatherCode: code, isRain: RAIN_CODES.has(code) };
  } catch {
    return null;
  }
}
