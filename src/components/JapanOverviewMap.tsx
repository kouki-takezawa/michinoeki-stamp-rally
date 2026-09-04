import { useEffect, useMemo, useRef, useState } from 'react';
import { useJapanProjection } from '../hooks/useJapanProjection';
import { useMapPanZoom } from '../hooks/useMapPanZoom';
import type { GeoErrorInfo, GeoStatus } from '../hooks/useGeolocation';
import { JAPAN_BASE_VIEWBOX, JAPAN_LOCATIONS } from '../lib/japanMapData';
import { PREFECTURE_NAME_TO_ID } from '../lib/prefectureMap';
import { REGIONS } from '../lib/regions';
import type { Station } from '../lib/types';

const NEARBY_ZOOM_SIZE = 40;

const GEO_ERROR_MESSAGE: Record<number, string> = {
  1: '位置情報の利用が許可されていません。ブラウザの設定から許可してください。',
  2: '現在地を取得できませんでした。電波の良い場所で再度お試しください。',
  3: '現在地の取得がタイムアウトしました。もう一度お試しください。',
};

interface Props {
  stations: Station[];
  checkedInIds: Set<string>;
  favorites: Set<string>;
  position: { lat: number; lng: number } | null;
  isManualPosition: boolean;
  status: GeoStatus;
  error: GeoErrorInfo | null;
  onRequestLocation: () => void;
  onSelect: (id: string) => void;
}

export function JapanOverviewMap({
  stations,
  checkedInIds,
  favorites,
  position,
  isManualPosition,
  status,
  error,
  onRequestLocation,
  onSelect,
}: Props) {
  const { projection, prefBBoxes, registerPath } = useJapanProjection(stations);
  const { svgRef, viewBox, handlers, zoomTo, reset } = useMapPanZoom(JAPAN_BASE_VIEWBOX);
  const [hasLocated, setHasLocated] = useState(false);
  const autoZoomedRef = useRef(false);

  const projectedStations = useMemo(() => {
    if (!projection) return [];
    return stations.map((s) => {
      const p = projection.project(s.lng, s.lat);
      return { ...s, x: p.x, y: p.y };
    });
  }, [projection, stations]);

  const userPoint = useMemo(() => {
    if (!projection || !position || isManualPosition) return null;
    return projection.project(position.lng, position.lat);
  }, [projection, position, isManualPosition]);

  const recenter = () => {
    if (!userPoint) return;
    zoomTo({
      x: userPoint.x - NEARBY_ZOOM_SIZE / 2,
      y: userPoint.y - NEARBY_ZOOM_SIZE / 2,
      w: NEARBY_ZOOM_SIZE,
      h: NEARBY_ZOOM_SIZE,
    });
    setHasLocated(true);
  };

  useEffect(() => {
    if (autoZoomedRef.current || !userPoint) return;
    autoZoomedRef.current = true;
    recenter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPoint]);

  const regionBoxes = useMemo(() => {
    if (!prefBBoxes) return [];
    return REGIONS.map((region) => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const prefName of region.prefectures) {
        const id = PREFECTURE_NAME_TO_ID[prefName];
        const bbox = id ? prefBBoxes.get(id) : undefined;
        if (!bbox) continue;
        minX = Math.min(minX, bbox.x);
        minY = Math.min(minY, bbox.y);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        maxY = Math.max(maxY, bbox.y + bbox.height);
      }
      if (minX === Infinity) return null;
      const pad = Math.max(maxX - minX, maxY - minY) * 0.2 + 6;
      return {
        id: region.id,
        name: region.name,
        box: { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 },
      };
    }).filter((r): r is { id: string; name: string; box: { x: number; y: number; w: number; h: number } } => r !== null);
  }, [prefBBoxes]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-bold text-ink-muted"
        >
          全国
        </button>
        {regionBoxes.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => zoomTo(r.box)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-bold text-ink-muted hover:text-ink"
          >
            {r.name}
          </button>
        ))}
        {userPoint && (
          <button
            type="button"
            onClick={recenter}
            className="ml-auto rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-white"
          >
            📍 現在地へ
          </button>
        )}
      </div>

      <div className="relative overflow-hidden rounded-lg border border-border bg-surface-2">
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          role="img"
          aria-label="日本地図（近くの道の駅）"
          className="h-[56vh] w-full touch-none"
          {...handlers}
        >
          {JAPAN_LOCATIONS.map((loc) => (
            <path
              key={loc.id}
              ref={registerPath(loc.id)}
              d={loc.path}
              fill="var(--color-surface)"
              stroke="var(--color-border)"
              strokeWidth={0.5}
            />
          ))}

          {projectedStations.map((s) => {
            const isChecked = checkedInIds.has(s.id);
            const isFavorite = favorites.has(s.id);
            return (
              <circle
                key={s.id}
                cx={s.x}
                cy={s.y}
                r={isChecked ? 1.6 : isFavorite ? 1.4 : 0.9}
                fill={isChecked ? '#b23b3b' : isFavorite ? '#c9781f' : 'var(--color-ink-faint)'}
                opacity={isChecked || isFavorite ? 0.9 : 0.45}
                onClick={() => onSelect(s.id)}
                className="cursor-pointer"
              />
            );
          })}

          {userPoint && (
            <g transform={`translate(${userPoint.x} ${userPoint.y})`}>
              <circle r={5} fill="none" stroke="var(--color-accent)" strokeWidth={0.6} className="pulse-ring" />
              <circle r={2} fill="#3d5a73" stroke="white" strokeWidth={0.6} />
            </g>
          )}
        </svg>

        {!position && (
          <div className="absolute inset-x-0 bottom-0 bg-surface/95 p-4 text-center backdrop-blur-sm">
            {status === 'loading' ? (
              <p className="text-sm text-ink-muted">現在地を取得中…</p>
            ) : (
              <>
                <p className="mb-2 text-sm text-ink-muted">
                  現在地を使うと、地図が近くの道の駅までズームします。
                </p>
                {status === 'error' && error && (
                  <p className="mb-2 text-xs text-red-600">
                    {GEO_ERROR_MESSAGE[error.code] ?? '現在地の取得に失敗しました。'}
                  </p>
                )}
                {status === 'unsupported' ? (
                  <p className="text-xs text-ink-faint">このブラウザは位置情報の取得に対応していません。</p>
                ) : (
                  <button
                    type="button"
                    onClick={onRequestLocation}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white"
                  >
                    現在地を取得する
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {position && !hasLocated && (
        <p className="mt-1.5 text-[11px] text-ink-faint">地図が現在地周辺にズームしました。ピンをタップすると詳細を確認できます。</p>
      )}
    </div>
  );
}
