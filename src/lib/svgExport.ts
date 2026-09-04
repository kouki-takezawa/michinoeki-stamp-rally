// ライブのSVG要素をcanvasへラスタライズする。
// CSSカスタムプロパティ（var(--color-*)）はSVGを単体画像として書き出すと解決されないため、
// 複製したツリーに実際に適用されている計算済みの色をインライン化してから書き出す。
function inlineComputedColors(original: SVGSVGElement, clone: SVGSVGElement): void {
  const originalEls = original.querySelectorAll<SVGElement>('*');
  const cloneEls = clone.querySelectorAll<SVGElement>('*');
  originalEls.forEach((el, i) => {
    const target = cloneEls[i];
    if (!target) return;
    const computed = getComputedStyle(el);
    target.style.fill = computed.fill;
    target.style.stroke = computed.stroke;
    target.style.opacity = computed.opacity;
    target.style.strokeWidth = computed.strokeWidth;
  });
  const rootComputed = getComputedStyle(original);
  clone.style.fill = rootComputed.fill;
  clone.style.stroke = rootComputed.stroke;
}

export async function svgToCanvas(
  svg: SVGSVGElement,
  width: number,
  height: number,
  background: string | ((ctx: CanvasRenderingContext2D, w: number, h: number) => void),
): Promise<HTMLCanvasElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineComputedColors(svg, clone);
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('SVGの画像化に失敗しました'));
    img.src = svgDataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  if (typeof background === 'function') {
    background(ctx, width, height);
  } else {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}
