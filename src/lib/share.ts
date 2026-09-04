interface ShareCardOptions {
  headline: string;
  subline: string;
  statLabel: string;
  statValue: string;
}

const WIDTH = 1200;
const HEIGHT = 630;

export function buildShareCanvas(opts: ShareCardOptions): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, '#1f4a25');
  bg.addColorStop(1, '#3c7a37');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(150 + i * 220, 560, 90, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 32px "Noto Sans JP", sans-serif';
  ctx.fillText('道の駅診断・スタンプラリー', 64, 84);

  ctx.font = '900 64px "Zen Kaku Gothic New", sans-serif';
  wrapText(ctx, opts.headline, 64, 220, WIDTH - 128, 74);

  ctx.font = '500 32px "Noto Sans JP", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(opts.subline, 64, 300);

  ctx.font = '700 28px "Noto Sans JP", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(opts.statLabel, 64, 480);
  ctx.font = '900 96px "JetBrains Mono", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(opts.statValue, 64, 570);

  return canvas;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  let line = '';
  let cursorY = y;
  for (const char of text) {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line !== '') {
      ctx.fillText(line, x, cursorY);
      line = char;
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, cursorY);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('画像の生成に失敗しました'))), 'image/png');
  });
}

export async function shareImage(canvas: HTMLCanvasElement, text: string): Promise<'shared' | 'downloaded'> {
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], 'michinoeki-share.png', { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title: '道の駅診断・スタンプラリー' });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'shared';
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'michinoeki-share.png';
  a.click();
  URL.revokeObjectURL(url);

  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(intent, '_blank', 'noopener,noreferrer');
  return 'downloaded';
}
