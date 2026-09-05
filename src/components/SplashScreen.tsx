import { useEffect, useRef, useState } from 'react';
import { currentSeasonalSkin } from '../lib/seasonalSkin';

const SESSION_KEY = 'michinoeki-splash-shown-v1';
const TOTAL_DURATION_MS = 3000;

// 全国に道の駅が点在することを抽象的に示す背景ドット(固定配置。再レンダーで位置が飛ばないようモジュール直下で定義)
const BG_DOTS = [
  { left: '18%', top: '22%' },
  { left: '72%', top: '16%' },
  { left: '84%', top: '40%' },
  { left: '30%', top: '68%' },
  { left: '60%', top: '74%' },
  { left: '12%', top: '52%' },
  { left: '50%', top: '30%' },
];

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// 「ホーム画面/ブラウザから新規に開いた時だけ」再生する。同じセッション内のリロードでは出さない
export function shouldShowSplash(): boolean {
  try {
    if (prefersReducedMotion()) return false;
    return sessionStorage.getItem(SESSION_KEY) !== '1';
  } catch {
    return false;
  }
}

function markSplashShown(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // ignore
  }
}

type Stage = 'car' | 'stamp' | 'logo' | 'out';

interface Props {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: Props) {
  const skin = currentSeasonalSkin();
  const [stage, setStage] = useState<Stage>('car');
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    markSplashShown();
    onFinish();
  };

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage('stamp'), 700),
      setTimeout(() => {
        setStage('logo');
        if (navigator.vibrate) navigator.vibrate(20);
      }, 1500),
      setTimeout(() => setStage('out'), 2300),
      setTimeout(finish, TOTAL_DURATION_MS),
    ];
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="読み込み中の画面をスキップ"
      onClick={finish}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') finish();
      }}
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center transition-opacity duration-300 ${
        stage === 'out' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: `linear-gradient(160deg, ${skin.bgFrom}, ${skin.bgTo})` }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {BG_DOTS.map((pos, i) => (
          <span
            key={i}
            className="pulse-dot absolute h-1.5 w-1.5 rounded-full"
            style={{ left: pos.left, top: pos.top, background: skin.accent, animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      <div className="relative flex h-24 w-24 items-center justify-center">
        {stage === 'car' && (
          <span className="onboarding-emoji text-6xl" aria-hidden="true">
            🚙
          </span>
        )}
        {stage !== 'car' && (
          <div className="stamp-pop relative flex items-center justify-center">
            <span className="pulse-ring absolute h-16 w-16 rounded-full border-4 border-white/70" aria-hidden="true" />
            <span className="territory-flash text-6xl" aria-hidden="true">
              🔖
            </span>
          </div>
        )}
      </div>

      {(stage === 'logo' || stage === 'out') && (
        <div className="sparkle-pop mt-4 text-center">
          <div className="font-display text-2xl font-black text-ink">道の駅ラリー</div>
          <div className="mt-1 text-xs font-bold text-ink-muted">全国の道の駅をめぐるスタンプラリー</div>
        </div>
      )}
    </div>
  );
}
