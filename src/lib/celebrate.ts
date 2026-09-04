import confetti from 'canvas-confetti';

// モーダル(z-50)より背面、通常コンテンツより前面に紙吹雪を出す
const Z_INDEX = 40;

export function celebrateCheckin(): void {
  if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 35,
    origin: { y: 0.7 },
    zIndex: Z_INDEX,
    colors: ['#3c7a37', '#7ecb75', '#a1650e', '#e0a83f', '#3d5a73'],
  });
}

// D15: 操作ごとに触覚フィードバックを差別化する（チェックイン=三連、お気に入り=単発の短い振動）
export function vibrateFavorite(): void {
  if (navigator.vibrate) navigator.vibrate(15);
}

export function celebrateBigMilestone(): void {
  if (navigator.vibrate) navigator.vibrate([40, 60, 40, 60, 80]);
  const duration = 1500;
  const end = Date.now() + duration;
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, zIndex: Z_INDEX });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, zIndex: Z_INDEX });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
