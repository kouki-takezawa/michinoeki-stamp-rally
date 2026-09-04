import { useState } from 'react';

interface Slide {
  emoji: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    emoji: '🔍',
    title: '近くの道の駅を探す',
    body: '全国1,231件の道の駅から、現在地に近い順にトップ10を表示します。',
  },
  {
    emoji: '📍',
    title: '着いたらチェックイン',
    body: '道の駅から300m以内に近づくとチェックインボタンが有効になります。',
  },
  {
    emoji: '🏆',
    title: '制覇率を伸ばそう',
    body: '都道府県ごとの制覇率やチェックイン履歴をマイページで確認できます。',
  },
];

interface Props {
  onFinish: () => void;
}

export function OnboardingModal({ onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-xl">
        <div className="mb-4 text-5xl" aria-hidden="true">
          {slide.emoji}
        </div>
        <h2 id="onboarding-title" className="mb-2 text-xl font-black">
          {slide.title}
        </h2>
        <p className="mb-6 text-sm text-ink-muted">{slide.body}</p>

        <div className="mb-5 flex justify-center gap-1.5">
          {SLIDES.map((s, i) => (
            <span
              key={s.title}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-5 bg-accent' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex((i) => i - 1)}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-bold text-ink-muted"
            >
              戻る
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? onFinish() : setIndex((i) => i + 1))}
            className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-bold text-white"
          >
            {isLast ? 'はじめる' : '次へ'}
          </button>
        </div>
        {!isLast && (
          <button
            type="button"
            onClick={onFinish}
            className="mt-3 text-xs text-ink-faint underline"
          >
            スキップ
          </button>
        )}
      </div>
    </div>
  );
}
