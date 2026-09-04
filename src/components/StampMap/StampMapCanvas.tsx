import { useEffect, useMemo, useRef, useState } from 'react';
import { useJapanProjection } from '../../hooks/useJapanProjection';
import { useMapPanZoom, type ViewBox } from '../../hooks/useMapPanZoom';
import { distanceMeters } from '../../lib/distance';
import { JAPAN_BASE_VIEWBOX, JAPAN_LOCATIONS } from '../../lib/japanMapData';
import { PREFECTURE_ID_TO_NAME, PREFECTURE_NAME_TO_ID } from '../../lib/prefectureMap';
import { REGIONS } from '../../lib/regions';
import { pickRouletteStation } from '../../lib/roulette';
import { currentSeasonalSkin } from '../../lib/seasonalSkin';
import { shareImage } from '../../lib/share';
import { svgToCanvas } from '../../lib/svgExport';
import type { Station } from '../../lib/types';
import type { CheckedStation, PrefectureRow } from './types';

const BASE_VIEWBOX = JAPAN_BASE_VIEWBOX;

interface Props {
  stations: Station[];
  checkedInIds: Set<string>;
  favorites: Set<string>;
  checkedStations: CheckedStation[];
  prefectureProgress: PrefectureRow[];
  position: { lat: number; lng: number } | null;
  onSelect: (id: string) => void;
}

export function StampMapCanvas({
  stations,
  checkedInIds,
  favorites,
  checkedStations,
  prefectureProgress,
  position,
  onSelect,
}: Props) {
  const { projection, prefBBoxes, registerPath } = useJapanProjection(stations);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [rouletteHighlight, setRouletteHighlight] = useState<{ id: string; name: string } | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [stampingId, setStampingId] = useState<string | null>(null);
  const [sparklePrefecture, setSparklePrefecture] = useState<string | null>(null);
  const [timelapseCount, setTimelapseCount] = useState<number | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const { svgRef, viewBox, handlers, zoomTo, reset } = useMapPanZoom(BASE_VIEWBOX);

  const orderedCheckins = useMemo(
    () => [...checkedStations].sort((a, b) => a.checkedInAt.localeCompare(b.checkedInAt)),
    [checkedStations],
  );

  useEffect(() => {
    if (timelapseCount === null) return;
    if (timelapseCount >= orderedCheckins.length) {
      const t = setTimeout(() => setTimelapseCount(null), 1200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTimelapseCount((c) => (c ?? 0) + 1), 350);
    return () => clearTimeout(t);
  }, [timelapseCount, orderedCheckins.length]);

  const isPlaying = timelapseCount !== null;
  const visibleCheckedIds = isPlaying
    ? new Set(orderedCheckins.slice(0, timelapseCount ?? 0).map((s) => s.id))
    : checkedInIds;

  const projectedStations = useMemo(() => {
    if (!projection) return [];
    return stations.map((s) => {
      const p = projection.project(s.lng, s.lat);
      return { ...s, x: p.x, y: p.y };
    });
  }, [projection, stations]);

  const routePath = useMemo(() => {
    const ordered = isPlaying ? orderedCheckins.slice(0, timelapseCount ?? 0) : orderedCheckins;
    if (!projection || ordered.length < 2) return '';
    return ordered
      .map((s, i) => {
        const p = projection.project(s.lng, s.lat);
        return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
      })
      .join(' ');
  }, [projection, orderedCheckins, isPlaying, timelapseCount]);

  const nearestUnvisited = useMemo(() => {
    if (!position) return null;
    let best: Station | null = null;
    let bestD = Infinity;
    for (const s of stations) {
      if (checkedInIds.has(s.id)) continue;
      const d = distanceMeters(position.lat, position.lng, s.lat, s.lng);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }, [position, stations, checkedInIds]);

  const prevPrefRef = useRef<Map<string, PrefectureRow> | null>(null);
  useEffect(() => {
    const prevMap = prevPrefRef.current;
    if (prevMap) {
      for (const row of prefectureProgress) {
        const prev = prevMap.get(row.prefecture);
        const prevDone = prev?.done ?? 0;
        if (prevDone < row.total && row.done >= row.total && row.total > 0) {
          setSparklePrefecture(row.prefecture);
          setTimeout(() => setSparklePrefecture(null), 2200);
        }
      }
    }
    prevPrefRef.current = new Map(prefectureProgress.map((r) => [r.prefecture, r]));
  }, [prefectureProgress]);

  const lastSeenLatestId = useRef<string | null>(null);
  useEffect(() => {
    const latest = checkedStations[0];
    if (!latest) return;
    if (lastSeenLatestId.current === latest.id) return;
    const isRecent = Date.now() - new Date(latest.checkedInAt).getTime() < 15000;
    lastSeenLatestId.current = latest.id;
    if (isRecent) {
      setStampingId(latest.id);
      setTimeout(() => setStampingId(null), 750);
    }
  }, [checkedStations]);

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
    }).filter((r): r is { id: string; name: string; box: ViewBox } => r !== null);
  }, [prefBBoxes]);

  const heatCells = useMemo(() => {
    if (!projection || !showHeatmap) return [];
    const cols = 30;
    const rows = Math.round(cols * (BASE_VIEWBOX.h / BASE_VIEWBOX.w));
    const cellW = BASE_VIEWBOX.w / cols;
    const cellH = BASE_VIEWBOX.h / rows;
    const counts = new Map<string, number>();
    for (const s of checkedStations) {
      const p = projection.project(s.lng, s.lat);
      const cx = Math.floor((p.x - BASE_VIEWBOX.x) / cellW);
      const cy = Math.floor((p.y - BASE_VIEWBOX.y) / cellH);
      const key = `${cx}-${cy}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const max = Math.max(1, ...counts.values());
    return Array.from(counts.entries()).map(([key, count]) => {
      const [cx, cy] = key.split('-').map(Number);
      return {
        key,
        x: BASE_VIEWBOX.x + cx * cellW,
        y: BASE_VIEWBOX.y + cy * cellH,
        w: cellW,
        h: cellH,
        opacity: 0.25 + 0.55 * (count / max),
      };
    });
  }, [projection, showHeatmap, checkedStations]);

  const skin = useMemo(() => currentSeasonalSkin(), []);
  const prefRowByName = useMemo(
    () => new Map(prefectureProgress.map((r) => [r.prefecture, r])),
    [prefectureProgress],
  );

  const handleRoulette = () => {
    const picked = pickRouletteStation(stations, checkedInIds, position);
    if (!picked || !projection) return;
    const p = projection.project(picked.lng, picked.lat);
    setRouletteHighlight({ id: picked.id, name: picked.name });
    setFocusedId(picked.id);
    setActiveRegion(picked.prefecture);
    zoomTo({ x: p.x - 12, y: p.y - 12, w: 24, h: 24 });
  };

  const focusOnStation = (s: CheckedStation) => {
    if (!projection) return;
    const p = projection.project(s.lng, s.lat);
    setFocusedId(s.id);
    setActiveRegion(s.prefecture);
    zoomTo({ x: p.x - 10, y: p.y - 10, w: 20, h: 20 });
  };

  const handleShareMap = async () => {
    if (!svgRef.current) return;
    const el = svgRef.current;
    const rect = el.getBoundingClientRect();
    const canvas = await svgToCanvas(el, Math.round(rect.width * 2), Math.round(rect.height * 2), (ctx, w, h) => {
      const gradient = ctx.createLinearGradient(0, 0, w * 0.6, h);
      gradient.addColorStop(0, skin.bgFrom);
      gradient.addColorStop(1, skin.bgTo);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    });
    const doneCount = checkedInIds.size;
    await shareImage(
      canvas,
      `道の駅診断・スタンプラリーで${doneCount}件の道の駅を巡りました！ #道の駅診断スタンプラリー`,
    );
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            reset();
            setActiveRegion(null);
          }}
          className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-bold text-ink-muted"
        >
          全国
        </button>
        {regionBoxes.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              zoomTo(r.box);
              setActiveRegion(r.name);
            }}
            aria-pressed={activeRegion === r.name}
            className={`rounded-lg border border-border px-2.5 py-1 text-xs font-bold hover:text-ink ${
              activeRegion === r.name ? 'bg-accent-soft text-accent' : 'bg-surface text-ink-muted'
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      <div className="mb-1.5 text-xs text-ink-faint">
        日本 {activeRegion ? `› ${activeRegion}` : '（全国表示）'}
      </div>

      <div
        className="relative overflow-hidden rounded-lg border border-border"
        style={{ background: `linear-gradient(160deg, ${skin.bgFrom}, ${skin.bgTo})` }}
      >
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          role="img"
          aria-label="道の駅スタンプマップ"
          className="h-[62vh] w-full touch-none"
          {...handlers}
        >
          {JAPAN_LOCATIONS.map((loc) => {
            const name = PREFECTURE_ID_TO_NAME[loc.id];
            const row = name ? prefRowByName.get(name) : undefined;
            const complete = !!row && row.total > 0 && row.done >= row.total;
            const started = !!row && row.done > 0;
            return (
              <path
                key={loc.id}
                ref={registerPath(loc.id)}
                d={loc.path}
                fill={started ? 'var(--color-accent-soft)' : 'var(--color-surface-2)'}
                stroke={complete ? '#c9a227' : 'var(--color-border)'}
                strokeWidth={complete ? 1.1 : 0.5}
              />
            );
          })}

          {sparklePrefecture &&
            prefBBoxes &&
            (() => {
              const id = PREFECTURE_NAME_TO_ID[sparklePrefecture];
              const bbox = id ? prefBBoxes.get(id) : undefined;
              if (!bbox) return null;
              return (
                <text
                  x={bbox.x + bbox.width / 2}
                  y={bbox.y + bbox.height / 2}
                  textAnchor="middle"
                  fontSize={bbox.width * 0.6}
                  className="sparkle-pop"
                >
                  ✨
                </text>
              );
            })()}

          {routePath && (
            <path d={routePath} fill="none" stroke="var(--color-accent)" strokeWidth={0.5} strokeOpacity={0.55} strokeDasharray="1.5 1.5" />
          )}

          {heatCells.map((c) => (
            <rect
              key={c.key}
              x={c.x}
              y={c.y}
              width={c.w}
              height={c.h}
              fill="#e2452d"
              opacity={c.opacity}
            />
          ))}

          {!showHeatmap &&
            projectedStations.map((s) => {
              const isChecked = visibleCheckedIds.has(s.id);
              const isFavorite = favorites.has(s.id);
              const isNearest = !isPlaying && nearestUnvisited?.id === s.id;
              const isHighlighted = focusedId === s.id;
              const isStamping = stampingId === s.id;
              return (
                <g
                  key={s.id}
                  transform={`translate(${s.x} ${s.y})`}
                  onClick={() => !isPlaying && onSelect(s.id)}
                  className={isPlaying ? undefined : 'cursor-pointer'}
                >
                  {isChecked ? (
                    <g className={isStamping ? 'stamp-pop' : undefined}>
                      <circle r={2.4} fill="none" stroke="#b23b3b" strokeWidth={0.9} opacity={0.85} transform="rotate(-14)" />
                      <circle r={1} fill="#b23b3b" opacity={0.9} />
                    </g>
                  ) : (
                    <circle
                      r={isFavorite ? 1.6 : 1}
                      fill={isFavorite ? '#c9781f' : 'var(--color-ink-faint)'}
                      opacity={isFavorite ? 0.9 : 0.4}
                    />
                  )}
                  {(isNearest || isHighlighted) && (
                    <circle
                      r={4.5}
                      fill="none"
                      stroke={isHighlighted ? '#c9781f' : 'var(--color-accent)'}
                      strokeWidth={0.6}
                      className="pulse-ring"
                    />
                  )}
                </g>
              );
            })}
        </svg>

        {rouletteHighlight && !isPlaying && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-surface px-3 py-1.5 text-xs font-bold shadow">
            🎯 {rouletteHighlight.name}
          </div>
        )}
        {isPlaying && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-surface px-3 py-1.5 text-xs font-bold shadow">
            🚏 {Math.min(timelapseCount ?? 0, orderedCheckins.length)} / {orderedCheckins.length}件目の訪問
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 text-ink-faint">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: 'var(--color-ink-faint)', opacity: 0.4 }} />
            未訪問
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full border border-[#b23b3b]" />
            訪問済み
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: '#c9781f' }} />
            お気に入り
          </span>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setShowHeatmap((v) => !v)}
            aria-pressed={showHeatmap}
            className={`rounded-lg border border-border px-2.5 py-1 font-bold ${showHeatmap ? 'bg-accent text-white' : 'bg-surface text-ink-muted'}`}
          >
            ヒートマップ
          </button>
          <button
            type="button"
            onClick={handleRoulette}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 font-bold text-ink-muted hover:text-ink"
          >
            🎲 今日の目的地
          </button>
          {orderedCheckins.length > 0 && (
            <button
              type="button"
              onClick={() => setTimelapseCount(isPlaying ? null : 0)}
              aria-pressed={isPlaying}
              className={`rounded-lg border border-border px-2.5 py-1 font-bold ${isPlaying ? 'bg-accent text-white' : 'bg-surface text-ink-muted hover:text-ink'}`}
            >
              {isPlaying ? '■ 停止' : '▶ 足跡を再生'}
            </button>
          )}
          <button
            type="button"
            onClick={handleShareMap}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 font-bold text-ink-muted hover:text-ink"
          >
            地図をシェア
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-ink-faint">
        点の密度は実際の道の駅の分布を反映しています（データの欠落ではありません）。地図は端末内で描画しているためオフラインでも閲覧できます。
      </p>

      {checkedStations.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-bold text-ink-muted">訪問スタンプ（タップで地図が移動します）</div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {checkedStations.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => focusOnStation(s)}
                className={`flex w-24 shrink-0 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center ${
                  focusedId === s.id ? 'border-accent bg-accent-soft' : 'border-border bg-surface'
                }`}
              >
                <span className="text-lg" aria-hidden="true">
                  🔴
                </span>
                <span className="w-full truncate text-[11px] font-bold">{s.name}</span>
                <span className="text-[10px] text-ink-faint">
                  {new Date(s.checkedInAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
