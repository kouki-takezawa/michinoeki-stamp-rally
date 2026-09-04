import { useState } from 'react';
import { buildGoogleCalendarUrl } from '../lib/calendarExport';

interface Props {
  stationName: string;
  prefecture: string;
}

export function PlanVisitButton({ stationName, prefecture }: Props) {
  const [date, setDate] = useState('');

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        aria-label="訪問予定日"
        className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
      />
      <a
        href={date ? buildGoogleCalendarUrl(`${stationName}を訪問`, date, `${prefecture} ${stationName}への訪問予定`) : undefined}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!date}
        onClick={(e) => {
          if (!date) e.preventDefault();
        }}
        className={`rounded-lg border border-border px-3 py-1.5 text-xs font-bold ${date ? 'text-accent' : 'pointer-events-none text-ink-faint'}`}
      >
        📅 カレンダーに追加
      </a>
    </div>
  );
}
