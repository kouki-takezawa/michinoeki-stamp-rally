export function buildGoogleCalendarUrl(title: string, dateStr: string, details: string): string {
  const date = dateStr.replace(/-/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${date}/${date}`,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
