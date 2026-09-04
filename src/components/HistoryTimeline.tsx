import type { CheckinRecord, CheckinTag, Station } from '../lib/types';
import { HistoryPhotoThumb } from './HistoryPhotoThumb';

const TAG_EMOJI: Record<CheckinTag, string> = {
  rest: '☕',
  meal: '🍚',
  onsen: '♨️',
  souvenir: '🎁',
};

type Entry = Station & CheckinRecord;

interface Props {
  entries: Entry[];
  onSelect: (id: string) => void;
}

function dateHeader(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return '今日';
  if (isYesterday) return '昨日';
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function HistoryTimeline({ entries, onSelect }: Props) {
  const groups: { header: string; items: Entry[] }[] = [];
  for (const e of entries) {
    const header = dateHeader(e.checkedInAt);
    const last = groups[groups.length - 1];
    if (last && last.header === header) {
      last.items.push(e);
    } else {
      groups.push({ header, items: [e] });
    }
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.header}>
          <div className="mb-1.5 text-xs font-bold text-ink-faint">{g.header}</div>
          <div className="overflow-hidden rounded-lg border border-border">
            {g.items.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
                className="flex w-full items-center gap-3 border-b border-border bg-surface px-4 py-3 text-left last:border-b-0 hover:bg-surface-2"
              >
                {s.hasPhoto && <HistoryPhotoThumb stationId={s.id} />}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">
                    {s.tag && <span className="mr-1">{TAG_EMOJI[s.tag]}</span>}
                    {s.name}
                  </div>
                  <div className="text-xs text-ink-faint">{s.prefecture}</div>
                </div>
                <div className="shrink-0 text-xs text-ink-faint">
                  {new Date(s.checkedInAt).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
