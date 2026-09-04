import type { Milestone } from '../lib/milestones';

const CONTENT: Record<Milestone['kind'], (m: Milestone) => { emoji: string; title: string; body: string }> = {
  first: () => ({
    emoji: '🎉',
    title: '初チェックイン達成！',
    body: 'はじめての道の駅にチェックインしました。この調子で制覇を進めましょう。',
  }),
  count: (m) => ({
    emoji: '🏅',
    title: `${m.kind === 'count' ? m.count : ''}件チェックイン達成！`,
    body: `累計チェックインが${m.kind === 'count' ? m.count : ''}件になりました。`,
  }),
  'prefecture-complete': (m) => ({
    emoji: '🗾',
    title: `${m.kind === 'prefecture-complete' ? m.prefecture : ''}制覇！`,
    body: `${m.kind === 'prefecture-complete' ? m.prefecture : ''}の道の駅をすべて訪問しました。`,
  }),
  'region-complete': (m) => ({
    emoji: '🌏',
    title: `${m.kind === 'region-complete' ? m.region : ''}ブロック制覇！`,
    body: `${m.kind === 'region-complete' ? m.region : ''}地方の都道府県をすべて制覇しました。`,
  }),
  'all-prefectures': () => ({
    emoji: '🏆',
    title: '全都道府県制覇！',
    body: '47都道府県すべてで道の駅にチェックインしました。日本一周達成です。',
  }),
  streak: (m) => ({
    emoji: '🔥',
    title: `${m.kind === 'streak' ? m.days : ''}日連続達成！`,
    body: `${m.kind === 'streak' ? m.days : ''}日連続でチェックインを記録しました。`,
  }),
};

interface Props {
  milestone: Milestone;
  onClose: () => void;
  onShare: () => void;
}

export function MilestoneModal({ milestone, onClose, onShare }: Props) {
  const { emoji, title, body } = CONTENT[milestone.kind](milestone);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="milestone-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-xl">
        <div className="mb-3 text-6xl" aria-hidden="true">
          {emoji}
        </div>
        <h2 id="milestone-title" className="mb-2 text-xl font-black text-accent">
          {title}
        </h2>
        <p className="mb-6 text-sm text-ink-muted">{body}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-bold text-ink-muted"
          >
            閉じる
          </button>
          <button
            type="button"
            onClick={onShare}
            className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-bold text-white"
          >
            シェアする
          </button>
        </div>
      </div>
    </div>
  );
}
