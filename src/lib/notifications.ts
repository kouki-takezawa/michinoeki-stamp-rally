// F17: アプリを開いている間だけ動く簡易近接通知（バックグラウンドPushサーバーは使わない）
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function notifyProximity(stationName: string, distanceLabel: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  new Notification(`まもなく「${stationName}」`, {
    body: `現在地から${distanceLabel}です。チェックインできます。`,
    icon: '/icon.svg',
    tag: `proximity-${stationName}`,
  });
}
