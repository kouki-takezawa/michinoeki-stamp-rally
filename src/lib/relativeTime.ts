const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;

export function formatRelativeTime(isoDate: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(isoDate).getTime()) / 1000);

  if (seconds < 5) return 'たった今';
  if (seconds < MINUTE) return `${Math.floor(seconds)}秒前`;
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}分前`;
  if (seconds < DAY) return `${Math.floor(seconds / HOUR)}時間前`;
  if (seconds < WEEK) return `${Math.floor(seconds / DAY)}日前`;

  const date = new Date(isoDate);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('ja-JP', {
    year: sameYear ? undefined : 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
