import { useState } from 'react';
import type { Goal } from '../lib/goals';

interface Props {
  goal: Goal | null;
  currentCount: number;
  onSet: (goal: Goal) => void;
  onClear: () => void;
}

export function GoalTracker({ goal, currentCount, onSet, onClear }: Props) {
  const [label, setLabel] = useState('日本一周');
  const [target, setTarget] = useState(47);
  const [date, setDate] = useState('');

  if (!goal) {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="目標名"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
          <input
            type="number"
            min={1}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-20 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
          <span className="self-center text-xs text-ink-faint">件</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => onSet({ label, targetCount: target, targetDate: date || undefined })}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white"
          >
            目標を設定
          </button>
        </div>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((currentCount / goal.targetCount) * 100));
  const daysLeft = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="text-sm">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-bold">{goal.label}</span>
        <span className="font-mono text-xs text-ink-muted">
          {currentCount} / {goal.targetCount}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      {daysLeft !== null && (
        <p className="mt-1.5 text-xs text-ink-faint">
          {daysLeft >= 0 ? `目標日まであと${daysLeft}日` : '目標日を過ぎています'}
        </p>
      )}
      <button type="button" onClick={onClear} className="mt-1.5 text-xs text-ink-faint underline">
        目標を削除
      </button>
    </div>
  );
}
