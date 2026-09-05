import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import stations from '../data/michinoeki.json';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { distanceMeters } from '../lib/distance';
import { MOBILE_TABBAR_SPACE, SHEET_PEEK_PX } from '../lib/layout';
import { capitalOfPrefecture } from '../lib/prefectureCapitals';
import { loadRecentSearches, loadRecentStationIds, recordRecentSearch } from '../lib/recentActivity';
import { activeSeasonalEvent } from '../lib/seasonalEvents';
import type { GeoErrorInfo, GeoPosition, GeoStatus } from '../hooks/useGeolocation';
import type { Station } from '../lib/types';
import { BottomSheet } from './BottomSheet';
import { FilterChips } from './FilterChips';
import { Footer } from './Footer';
import { MapPreviewCard } from './MapPreviewCard';
import { NearbyStrip } from './NearbyStrip';
import { OfflineMapButton } from './OfflineMapButton';
import { PrefecturePicker } from './PrefecturePicker';
import { SearchFilterBar } from './SearchFilterBar';
import { SearchInput } from './SearchInput';
import { StationListSkeleton } from './Skeleton';
import { StationListItem } from './StationListItem';

const MapView = lazy(() => import('./MapView').then((m) => ({ default: m.MapView })));

const allStations = stations as Station[];
const DEFAULT_LIMIT = 10;
const FILTERED_LIMIT = 50;

const GEO_ERROR_MESSAGE: Record<number, string> = {
  1: '位置情報の利用が許可されていません。ブラウザの設定から許可してください。',
  2: '現在地を取得できませんでした。電波の良い場所で再度お試しください。',
  3: '現在地の取得がタイムアウトしました。もう一度お試しください。',
};

interface Props {
  position: GeoPosition | null;
  isManualPosition: boolean;
  status: GeoStatus;
  error: GeoErrorInfo | null;
  onStart: () => void;
  onManualPick: (lat: number, lng: number, prefecture: string) => void;
  onClearManual: () => void;
  checkedInIds: Set<string>;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  onSelect: (id: string) => void;
  prefectureJump?: { prefecture: string; token: number } | null;
  distanceMap?: Map<string, number>;
}

const PREFECTURES = Array.from(new Set(allStations.map((s) => s.prefecture))).sort((a, b) =>
  a.localeCompare(b, 'ja'),
);

const MAP_FALLBACK = <div className="h-full w-full animate-pulse bg-surface-2" />;

export function NearbyScreen({
  position,
  isManualPosition,
  status,
  error,
  onStart,
  onManualPick,
  onClearManual,
  checkedInIds,
  favorites,
  onToggleFavorite,
  onSelect,
  prefectureJump,
  distanceMap,
}: Props) {
  const [query, setQuery] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const lastJumpToken = useRef<number | null>(null);

  useEffect(() => {
    if (!prefectureJump || prefectureJump.token === lastJumpToken.current) return;
    lastJumpToken.current = prefectureJump.token;
    setQuery('');
    setPrefecture(prefectureJump.prefecture);
  }, [prefectureJump]);
  const [facility, setFacility] = useState('');
  const [unvisitedOnly, setUnvisitedOnly] = useState(false);
  const [showPrefecturePicker, setShowPrefecturePicker] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [previewStationId, setPreviewStationId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const seasonalEvent = useMemo(() => activeSeasonalEvent(), []);
  const [recentSearches, setRecentSearches] = useState(() => loadRecentSearches());
  const recentStations = useMemo(() => {
    const ids = loadRecentStationIds();
    return ids.map((id) => allStations.find((s) => s.id === id)).filter((s): s is Station => !!s);
  }, []);

  const filteredStations = useMemo(() => {
    const q = query.trim();
    return allStations
      .filter((s) => (q ? s.name.includes(q) || s.nameKana?.includes(q) : true))
      .filter((s) => (prefecture ? s.prefecture === prefecture : true))
      .filter((s) => (facility ? (s.facilities ?? []).includes(facility) : true))
      .filter((s) => (unvisitedOnly ? !checkedInIds.has(s.id) : true));
  }, [query, prefecture, facility, unvisitedOnly, checkedInIds]);

  // 都道府県が変わったときだけ再計算する地図フォーカス対象（検索語・設備・未訪問フィルタの変化では発火させない）。
  // 県庁所在地へカメラを移動させる。未選択時はnull（全国表示に戻す）
  const focusTarget = useMemo(() => (prefecture ? capitalOfPrefecture(prefecture) ?? null : null), [prefecture]);

  const withDistance = useMemo(() => {
    if (!position) return [];
    return filteredStations
      .map((s) => ({
        ...s,
        distanceM: distanceMap?.get(s.id) ?? distanceMeters(position.lat, position.lng, s.lat, s.lng),
      }))
      .sort((a, b) => a.distanceM - b.distanceM);
  }, [filteredStations, position, distanceMap]);

  const isFiltering = query.trim() !== '' || prefecture !== '' || facility !== '' || unvisitedOnly;
  const visibleList = withDistance.slice(0, isFiltering ? FILTERED_LIMIT : DEFAULT_LIMIT);

  // 検索結果が0件のとき、有効な条件を1つだけ外すと何件ヒットするかを試算し、
  // 最も効果が大きい緩和策を1つだけ提案する（複数出すと選択に迷わせるため）
  const emptyResultSuggestion = useMemo(() => {
    if (filteredStations.length > 0) return null;
    const q = query.trim();
    const countWith = (opts: { q?: string; pref?: string; fac?: string; unvisited?: boolean }) =>
      allStations
        .filter((s) => (opts.q ? s.name.includes(opts.q) || s.nameKana?.includes(opts.q) : true))
        .filter((s) => (opts.pref ? s.prefecture === opts.pref : true))
        .filter((s) => (opts.fac ? (s.facilities ?? []).includes(opts.fac) : true))
        .filter((s) => (opts.unvisited ? !checkedInIds.has(s.id) : true)).length;

    const candidates: { label: string; count: number; clear: () => void }[] = [];
    if (q) {
      const count = countWith({ pref: prefecture, fac: facility, unvisited: unvisitedOnly });
      if (count > 0) candidates.push({ label: `「${q}」の検索語を外す`, count, clear: () => setQuery('') });
    }
    if (prefecture) {
      const count = countWith({ q, fac: facility, unvisited: unvisitedOnly });
      if (count > 0) candidates.push({ label: `${prefecture}の絞り込みを外して全国から探す`, count, clear: () => setPrefecture('') });
    }
    if (facility) {
      const count = countWith({ q, pref: prefecture, unvisited: unvisitedOnly });
      if (count > 0) candidates.push({ label: `「${facility}」の条件を外す`, count, clear: () => setFacility('') });
    }
    if (unvisitedOnly) {
      const count = countWith({ q, pref: prefecture, fac: facility });
      if (count > 0) candidates.push({ label: '未訪問のみの条件を外す', count, clear: () => setUnvisitedOnly(false) });
    }
    candidates.sort((a, b) => b.count - a.count);
    return candidates[0] ?? null;
  }, [filteredStations.length, query, prefecture, facility, unvisitedOnly, checkedInIds]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [query, prefecture, facility, unvisitedOnly]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      if (visibleList.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHoveredId(null);
        setFocusedIndex((i) => Math.min(visibleList.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHoveredId(null);
        setFocusedIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        const s = visibleList[focusedIndex];
        if (s) onSelect(s.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visibleList, focusedIndex, onSelect]);

  useEffect(() => {
    if (focusedIndex < 0) return;
    listRef.current?.querySelector(`[data-row-index="${focusedIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  // 地図上でピンをタップした際、対応するリスト行もハイライト・スクロールして双方向に連動させる
  useEffect(() => {
    if (!previewStationId) return;
    const idx = visibleList.findIndex((s) => s.id === previewStationId);
    if (idx >= 0) {
      listRef.current?.querySelector(`[data-row-index="${idx}"]`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [previewStationId, visibleList]);

  const highlightedId =
    previewStationId ?? hoveredId ?? (focusedIndex >= 0 ? (visibleList[focusedIndex]?.id ?? null) : null);

  const previewStation = previewStationId ? allStations.find((s) => s.id === previewStationId) : undefined;
  const previewDistance = previewStation
    ? (withDistance.find((s) => s.id === previewStation.id)?.distanceM ??
      distanceMap?.get(previewStation.id) ??
      (position ? distanceMeters(position.lat, position.lng, previewStation.lat, previewStation.lng) : null))
    : null;

  const renderList = (limit: number, emptyMessage: string) => (
    <div ref={listRef}>
      {visibleList.length === 0 ? (
        <div className="py-8 text-center text-sm text-ink-muted">
          <p>{emptyMessage}</p>
          {emptyResultSuggestion && (
            <button
              type="button"
              onClick={emptyResultSuggestion.clear}
              className="mt-3 rounded-lg border border-accent px-3 py-1.5 text-xs font-bold text-accent"
            >
              {emptyResultSuggestion.label}（{emptyResultSuggestion.count}件ヒット）
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          {visibleList.map((s, i) => (
            <div key={s.id} data-row-index={i}>
              <StationListItem
                station={s}
                origin={position}
                isCheckedIn={checkedInIds.has(s.id)}
                isFavorite={favorites.has(s.id)}
                isHighlighted={highlightedId === s.id}
                query={query}
                onSelect={onSelect}
                onToggleFavorite={onToggleFavorite}
                onHover={setHoveredId}
              />
            </div>
          ))}
        </div>
      )}
      {isFiltering && withDistance.length > limit && (
        <p className="mt-2 text-center text-xs text-ink-faint">
          他{withDistance.length - limit}件あります。絞り込みを追加してください
        </p>
      )}
    </div>
  );

  const handleCommitSearch = (term: string) => {
    if (term.trim()) setRecentSearches(recordRecentSearch(term));
  };

  const filterBar = (
    <SearchFilterBar
      prefecture={prefecture}
      onPrefectureChange={setPrefecture}
      prefectures={PREFECTURES}
      facility={facility}
      onFacilityChange={setFacility}
      unvisitedOnly={unvisitedOnly}
      onUnvisitedOnlyChange={setUnvisitedOnly}
    />
  );

  const filterChips = (
    <FilterChips
      chips={[
        ...(query.trim() ? [{ key: 'query', label: `「${query}」`, onRemove: () => setQuery('') }] : []),
        ...(prefecture ? [{ key: 'pref', label: prefecture, onRemove: () => setPrefecture('') }] : []),
        ...(facility ? [{ key: 'facility', label: facility, onRemove: () => setFacility('') }] : []),
        ...(unvisitedOnly ? [{ key: 'unvisited', label: '未訪問のみ', onRemove: () => setUnvisitedOnly(false) }] : []),
      ]}
      onClearAll={() => {
        setQuery('');
        setPrefecture('');
        setFacility('');
        setUnvisitedOnly(false);
      }}
    />
  );

  const seasonalBanner = seasonalEvent && (
    <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent-soft px-3 py-2 text-xs font-bold text-accent">
      <span aria-hidden="true">{seasonalEvent.emoji}</span>
      {seasonalEvent.title}開催中
    </div>
  );

  const recentStationsStrip = !isFiltering && recentStations.length > 0 && (
    <div className="mb-3">
      <div className="mb-1.5 text-xs font-bold text-ink-faint">最近見た道の駅</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {recentStations.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className="flex w-28 shrink-0 flex-col items-start gap-0.5 rounded-lg border border-border bg-surface px-3 py-2 text-left"
          >
            <span className="w-full truncate text-xs font-bold">{s.name}</span>
            <span className="text-[11px] text-ink-faint">{s.prefecture}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const locationStatusLine = position ? (
    isManualPosition ? (
      <button type="button" onClick={onClearManual} className="text-xs text-ink-muted underline">
        推定位置で表示中（都道府県中心）・GPSに切り替える
      </button>
    ) : (
      <button type="button" onClick={onStart} className="text-xs text-ink-muted underline">
        現在地を更新（精度 ±{Math.round(position.accuracy)}m）
      </button>
    )
  ) : null;

  const locationCta = !position && (
    <div className="pointer-events-auto rounded-lg border border-border bg-surface p-4 text-sm shadow-sm">
      {status === 'loading' ? (
        <>
          <p className="mb-2 text-ink-muted">現在地を取得中…</p>
          <StationListSkeleton rows={3} />
        </>
      ) : (
        <>
          <p className="mb-2 font-bold">現在地を使って近くの道の駅を探します</p>
          {status === 'error' && error && (
            <p className="mb-2 text-xs text-red-600">
              {GEO_ERROR_MESSAGE[error.code] ?? '現在地の取得に失敗しました。'}
            </p>
          )}
          {status === 'unsupported' ? (
            <p className="text-xs text-ink-faint">このブラウザは位置情報の取得に対応していません。</p>
          ) : (
            <button type="button" onClick={onStart} className="rounded-lg bg-accent px-4 py-2 font-bold text-white">
              現在地を取得する
            </button>
          )}
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowPrefecturePicker((v) => !v)}
              className="text-xs text-ink-muted underline"
            >
              都道府県から探す
            </button>
          </div>
          {showPrefecturePicker && (
            <div className="mt-3">
              <PrefecturePicker
                onPick={(lat, lng, pref) => {
                  onManualPick(lat, lng, pref);
                  setShowPrefecturePicker(false);
                }}
                onCancel={() => setShowPrefecturePicker(false)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );

  const mapPreview = previewStation && (
    <MapPreviewCard
      station={previewStation}
      distanceM={previewDistance}
      origin={position}
      isCheckedIn={checkedInIds.has(previewStation.id)}
      isFavorite={favorites.has(previewStation.id)}
      onOpenDetail={() => onSelect(previewStation.id)}
      onClose={() => setPreviewStationId(null)}
    />
  );

  if (isDesktop) {
    return (
      <div className="flex h-[calc(100vh-1px)] pl-[var(--sidebar-w)]">
        <div className="w-[420px] shrink-0 overflow-y-auto border-r border-border p-6">
          <div className="mb-1 text-xs font-bold tracking-wide text-accent">NEARBY</div>
          <h1 className="mb-2 text-2xl font-black">近くの道の駅</h1>
          <p className="mb-4 text-sm text-ink-muted">
            全国{allStations.length}件の道の駅から、現在地に近い順に探せます。矢印キーで移動、Enterで詳細を開けます。
          </p>
          {seasonalBanner}
          <div className="mb-3">
            <SearchInput
              query={query}
              onQueryChange={setQuery}
              recentSearches={recentSearches}
              onCommitSearch={handleCommitSearch}
              pill
            />
          </div>
          {filterBar}
          {locationCta}
          {position && (
            <>
              <div className="mb-3">{locationStatusLine}</div>
              {filterChips}
              {recentStationsStrip}
              <div className="mb-3">
                <OfflineMapButton position={{ lat: position.lat, lng: position.lng }} />
              </div>
              {renderList(DEFAULT_LIMIT, '条件に一致する道の駅が見つかりませんでした。')}
            </>
          )}
          <Footer />
        </div>
        <div className="relative flex-1">
          <Suspense fallback={MAP_FALLBACK}>
            <MapView
              stations={filteredStations}
              focusTarget={focusTarget}
              checkedInIds={checkedInIds}
              favorites={favorites}
              userLat={isManualPosition ? undefined : position?.lat}
              userLng={isManualPosition ? undefined : position?.lng}
              userAccuracy={isManualPosition ? undefined : position?.accuracy}
              highlightedId={highlightedId}
              onMarkerTap={setPreviewStationId}
              onRequestLocation={onStart}
            />
          </Suspense>
          {mapPreview && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
              {mapPreview}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-0" style={{ bottom: MOBILE_TABBAR_SPACE }}>
      <Suspense fallback={MAP_FALLBACK}>
        <MapView
          stations={filteredStations}
          focusTarget={focusTarget}
          checkedInIds={checkedInIds}
          favorites={favorites}
          userLat={isManualPosition ? undefined : position?.lat}
          userLng={isManualPosition ? undefined : position?.lng}
          userAccuracy={isManualPosition ? undefined : position?.accuracy}
          highlightedId={highlightedId}
          onMarkerTap={setPreviewStationId}
          onRequestLocation={onStart}
        />
      </Suspense>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-2 px-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <div className="pointer-events-auto w-full max-w-sm">
          <SearchInput
            query={query}
            onQueryChange={setQuery}
            recentSearches={recentSearches}
            onCommitSearch={handleCommitSearch}
            pill
          />
        </div>
        {!position && <div className="w-full max-w-sm">{locationCta}</div>}
      </div>

      {mapPreview && (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-3"
          style={{ bottom: SHEET_PEEK_PX + 12 }}
        >
          {mapPreview}
        </div>
      )}

      {position && (
        <BottomSheet
          forcePeekKey={previewStationId}
          onPullToRefresh={!isManualPosition ? onStart : undefined}
          header={
            <NearbyStrip stations={withDistance.slice(0, 8)} checkedInIds={checkedInIds} onSelect={onSelect} />
          }
        >
          {seasonalBanner}
          <div className="mb-2">{locationStatusLine}</div>
          {filterBar}
          {filterChips}
          {recentStationsStrip}
          <div className="mb-3">
            <OfflineMapButton position={{ lat: position.lat, lng: position.lng }} />
          </div>
          {renderList(DEFAULT_LIMIT, '条件に一致する道の駅が見つかりませんでした。')}
          <Footer />
        </BottomSheet>
      )}
    </div>
  );
}
