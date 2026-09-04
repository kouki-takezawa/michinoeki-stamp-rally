const WALK_SPEED_KMH = 4.5;
const DRIVE_SPEED_KMH = 35;

function formatMinutes(hours: number): string {
  const minutes = Math.round(hours * 60);
  if (minutes < 1) return '1分未満';
  if (minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

export function estimateEta(distanceM: number): { walk: string; drive: string } {
  const km = distanceM / 1000;
  return {
    walk: formatMinutes(km / WALK_SPEED_KMH),
    drive: formatMinutes(km / DRIVE_SPEED_KMH),
  };
}
