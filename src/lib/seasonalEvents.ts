// F14: 期間限定イベントバッジ（サーバー不要のローカル定義。日付は毎年固定のもののみ）
export interface SeasonalEvent {
  id: string;
  title: string;
  emoji: string;
  isActive: (d: Date) => boolean;
}

function inRange(d: Date, startMonth: number, startDay: number, endMonth: number, endDay: number): boolean {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const value = m * 100 + day;
  const start = startMonth * 100 + startDay;
  const end = endMonth * 100 + endDay;
  return start <= end ? value >= start && value <= end : value >= start || value <= end;
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  { id: 'gw', title: 'ゴールデンウィーク遠征チャレンジ', emoji: '🎏', isActive: (d) => inRange(d, 4, 27, 5, 6) },
  { id: 'summer', title: '夏休みドライブスタンプラリー', emoji: '🏖️', isActive: (d) => inRange(d, 7, 20, 8, 31) },
  { id: 'autumn', title: '紅葉ドライブシーズン', emoji: '🍁', isActive: (d) => inRange(d, 10, 15, 11, 30) },
  { id: 'newyear', title: '年末年始ロングドライブ', emoji: '🎍', isActive: (d) => inRange(d, 12, 28, 1, 3) },
];

export function activeSeasonalEvent(date = new Date()): SeasonalEvent | null {
  return SEASONAL_EVENTS.find((e) => e.isActive(date)) ?? null;
}
