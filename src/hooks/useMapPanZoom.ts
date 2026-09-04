import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 8;

function clampViewBox(vb: ViewBox, base: ViewBox): ViewBox {
  const aspect = base.w / base.h;
  const minW = base.w / MAX_SCALE;
  const maxW = base.w / MIN_SCALE;
  // 縦横比を保ちつつ、指定領域の縦・横どちらも収まる幅を採用する
  const requiredW = Math.max(vb.w, vb.h * aspect);
  const w = Math.min(maxW, Math.max(minW, requiredW));
  const h = w / aspect;
  const cx = vb.x + vb.w / 2;
  const cy = vb.y + vb.h / 2;
  let x = cx - w / 2;
  let y = cy - h / 2;
  const margin = w * 0.4;
  x = Math.min(base.x + base.w - w + margin, Math.max(base.x - margin, x));
  y = Math.min(base.y + base.h - h + margin, Math.max(base.y - margin, y));
  return { x, y, w, h };
}

export function useMapPanZoom(base: ViewBox) {
  const [viewBox, setViewBox] = useState<ViewBox>(base);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragState = useRef<{ x: number; y: number; vb: ViewBox } | null>(null);
  const pinchState = useRef<{ dist: number; vb: ViewBox } | null>(null);

  const screenToSvgScale = useCallback((vb: ViewBox) => {
    const el = svgRef.current;
    if (!el) return { sx: 1, sy: 1 };
    const rect = el.getBoundingClientRect();
    return { sx: vb.w / rect.width, sy: vb.h / rect.height };
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      setViewBox((vb) => {
        const { sx, sy } = screenToSvgScale(vb);
        const rect = svgRef.current!.getBoundingClientRect();
        const px = vb.x + (e.clientX - rect.left) * sx;
        const py = vb.y + (e.clientY - rect.top) * sy;
        const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
        const newW = vb.w * factor;
        const newH = vb.h * factor;
        const newX = px - ((px - vb.x) / vb.w) * newW;
        const newY = py - ((py - vb.y) / vb.h) * newH;
        return clampViewBox({ x: newX, y: newY, w: newW, h: newH }, base);
      });
    },
    [base, screenToSvgScale],
  );

  const viewBoxRef = useRef(viewBox);
  useEffect(() => {
    viewBoxRef.current = viewBox;
  }, [viewBox]);

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragState.current = { x: e.clientX, y: e.clientY, vb: viewBoxRef.current };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragState.current) return;
      const { sx, sy } = screenToSvgScale(dragState.current.vb);
      const dx = (e.clientX - dragState.current.x) * sx;
      const dy = (e.clientY - dragState.current.y) * sy;
      setViewBox(
        clampViewBox(
          { ...dragState.current.vb, x: dragState.current.vb.x - dx, y: dragState.current.vb.y - dy },
          base,
        ),
      );
    },
    [base, screenToSvgScale],
  );

  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  const touchDist = (touches: React.TouchList) => {
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const onTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      pinchState.current = { dist: touchDist(e.touches), vb: viewBoxRef.current };
    }
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length === 2 && pinchState.current) {
        e.preventDefault();
        const newDist = touchDist(e.touches);
        const factor = pinchState.current.dist / newDist;
        const { vb } = pinchState.current;
        const cx = vb.x + vb.w / 2;
        const cy = vb.y + vb.h / 2;
        const newW = vb.w * factor;
        const newH = vb.h * factor;
        setViewBox(
          clampViewBox({ x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH }, base),
        );
      }
    },
    [base],
  );

  const onTouchEnd = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length < 2) pinchState.current = null;
  }, []);

  const zoomTo = useCallback(
    (target: ViewBox) => {
      setViewBox(clampViewBox(target, base));
    },
    [base],
  );

  const reset = useCallback(() => setViewBox(base), [base]);

  const handlers = useMemo(
    () => ({
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave: onPointerUp,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    }),
    [onWheel, onPointerDown, onPointerMove, onPointerUp, onTouchStart, onTouchMove, onTouchEnd],
  );

  return { svgRef, viewBox, handlers, zoomTo, reset };
}
