import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import stations from '../data/michinoeki.json';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { distanceMeters } from '../lib/distance';
import { MOBILE_TABBAR_SPACE } from '../lib/layout';
import { capitalOfPrefecture } from '../lib/prefectureCapitals';
import { loadRecentSearches, loadRecentStationIds, recordRecentSearch } from '../lib/recentActivity';
import { activeSeasonalEvent } from '../lib/seasonalEvents';
import type { GeoErrorInfo, GeoPosition, GeoStatus } from '../hooks/useGeolocation';
import type { Station } from '../lib/types';
import { BottomSheet } from './BottomSheet';
import { FilterChips } from './FilterChips';
import { Footer } from './Footer';
import { NearbyStrip } from './NearbyStrip';
import { OfflineMapButton } from './OfflineMapButton';
import { PrefecturePicker } from './PrefecturePicker';
import { SearchFilterBar } from './SearchFilterBar';
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
}: Props) {
  const [query, setQuery] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [facility, setFacility] = useState('');
  const [unvisitedOnly, setUnvisitedOnly] = useState(false);
  const [showPrefecturePicker, setShowPrefecturePicker] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
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
      .map((s) => ({ ...s, distanceM: distanceMeters(position.lat, position.lng, s.lat, s.lng) }))
      .sort((a, b) => a.distanceM - b.distanceM);
  }, [filteredStations, position]);

  const isFiltering = query.trim() !== '' || prefecture !== '' || facility !== '' || unvisitedOnly;
  const visibleList = withDistance.slice(0, isFiltering ? FILTERED_LIMIT : DEFAULT_LIMIT);

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

  const highlightedId = hoveredId ?? (focusedIndex >= 0 ? (visibleList[focusedIndex]?.id ?? null) : null);

  const renderList = (limit: number, emptyMessage: string) => (
    <div ref={listRef}>
      {visibleList.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">{emptyMessage}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          {visibleList.map((s, i) => (
            <div key={s.id} data-row-index={i}>
              <StationListItem
                station={s}
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

  const searchBar = (
    <SearchFilterBar
      query={query}
      onQueryChange={setQuery}
      prefecture={prefecture}
      onPrefectureChange={setPrefecture}
      prefectures={PREFECTURES}
      facility={facility}
      onFacilityChange={setFacility}
      unvisitedOnly={unvisitedOnly}
      onUnvisitedOnlyChange={setUnvisitedOnly}
      recentSearches={recentSearches}
      onCommitSearch={(term) => {
        if (term.trim()) setRecentSearches(recordRecentSearch(term));
      }}
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
    <div className="rounded-lg border border-border bg-surface p-4 text-sm shadow-sm">
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

  if (isDesktop) {
    return (
      <div className="flex h-[calc(100vh-1px)] pl-56">
        <div className="w-[420px] shrink-0 overflow-y-auto border-r border-border p-6">
          <div className="mb-1 text-xs font-bold tracking-wide text-accent">NEARBY</div>
          <h1 className="mb-2 text-2xl font-black">近くの道の駅</h1>
          <p className="mb-4 text-sm text-ink-muted">
            全国{allStations.length}件の道の駅から、現在地に近い順に探せます。矢印キーで移動、Enterで詳細を開けます。
          </p>
          {seasonalBanner}
          {locationCta}
          {position && (
            <>
              <div className="mt-4 mb-3">{locationStatusLine}</div>
              <div className="mb-3">{searchBar}</div>
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
              highlightedId={highlightedId}
              onSelect={onSelect}
            />
          </Suspense>
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
          highlightedId={highlightedId}
          onSelect={onSelect}
        />
      </Suspense>

      {!position && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
          <div className="pointer-events-auto w-full max-w-sm">{locationCta}</div>
        </div>
      )}

      {position && (
        <BottomSheet
          header={
            <NearbyStrip stations={withDistance.slice(0, 8)} checkedInIds={checkedInIds} onSelect={onSelect} />
          }
        >
          {seasonalBanner}
          <div className="mb-2">{locationStatusLine}</div>
          <div className="mb-3">{searchBar}</div>
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
