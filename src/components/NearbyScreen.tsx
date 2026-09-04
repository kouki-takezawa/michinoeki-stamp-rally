import { lazy, Suspense, useMemo, useState } from 'react';
import stations from '../data/michinoeki.json';
import { distanceMeters } from '../lib/distance';
import type { GeoErrorInfo, GeoPosition, GeoStatus } from '../hooks/useGeolocation';
import type { Station } from '../lib/types';
import { JapanOverviewMap } from './JapanOverviewMap';
import { PrefecturePicker } from './PrefecturePicker';
import { PullToRefresh } from './PullToRefresh';
import { SearchFilterBar } from './SearchFilterBar';
import { StationListItem } from './StationListItem';

const MapView = lazy(() => import('./MapView').then((m) => ({ default: m.MapView })));

const allStations = stations as Station[];
const DEFAULT_LIMIT = 10;
const FILTERED_LIMIT = 50;

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
  const [unvisitedOnly, setUnvisitedOnly] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('map');
  const [showPrefecturePicker, setShowPrefecturePicker] = useState(false);

  const filtered = useMemo(() => {
    if (!position) return [];
    const q = query.trim();
    return allStations
      .filter((s) => (q ? s.name.includes(q) : true))
      .filter((s) => (prefecture ? s.prefecture === prefecture : true))
      .filter((s) => (unvisitedOnly ? !checkedInIds.has(s.id) : true))
      .map((s) => ({ ...s, distanceM: distanceMeters(position.lat, position.lng, s.lat, s.lng) }))
      .sort((a, b) => a.distanceM - b.distanceM);
  }, [position, query, prefecture, unvisitedOnly, checkedInIds]);

  const isFiltering = query.trim() !== '' || prefecture !== '' || unvisitedOnly;
  const visible = filtered.slice(0, isFiltering ? FILTERED_LIMIT : DEFAULT_LIMIT);
  const visibleOnMap = view === 'map' ? filtered.slice(0, isFiltering ? FILTERED_LIMIT : 150) : visible;

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-1 text-xs font-bold tracking-wide text-accent">NEARBY</div>
      <h1 className="mb-2 text-2xl font-black">近くの道の駅</h1>
      <p className="mb-5 text-sm text-ink-muted">
        全国{allStations.length}件の道の駅から、現在地に近い順に探せます。
      </p>

      <JapanOverviewMap
        stations={allStations}
        checkedInIds={checkedInIds}
        favorites={favorites}
        position={position}
        isManualPosition={isManualPosition}
        status={status}
        error={error}
        onRequestLocation={onStart}
        onSelect={onSelect}
      />

      {!position && status !== 'loading' && (
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={() => setShowPrefecturePicker((v) => !v)}
            className="text-xs text-ink-muted underline"
          >
            位置情報が使えない場合は都道府県から探す
          </button>
          {showPrefecturePicker && (
            <div className="mt-3 text-left">
              <PrefecturePicker
                onPick={(lat, lng, pref) => {
                  onManualPick(lat, lng, pref);
                  setShowPrefecturePicker(false);
                }}
                onCancel={() => setShowPrefecturePicker(false)}
              />
            </div>
          )}
        </div>
      )}

      {position && (
        <>
          <div className="mt-6 mb-3 flex items-center justify-between">
            {isManualPosition ? (
              <button type="button" onClick={onClearManual} className="text-xs text-ink-muted underline">
                推定位置で表示中（都道府県中心）・GPSに切り替える
              </button>
            ) : (
              <button type="button" onClick={onStart} className="text-xs text-ink-muted underline">
                現在地を更新（精度 ±{Math.round(position.accuracy)}m）
              </button>
            )}
            <div role="group" aria-label="表示形式" className="flex overflow-hidden rounded-lg border border-border text-xs font-bold">
              <button
                type="button"
                onClick={() => setView('list')}
                aria-pressed={view === 'list'}
                className={`px-3 py-1.5 ${view === 'list' ? 'bg-accent text-white' : 'bg-surface text-ink-muted'}`}
              >
                リスト
              </button>
              <button
                type="button"
                onClick={() => setView('map')}
                aria-pressed={view === 'map'}
                className={`px-3 py-1.5 ${view === 'map' ? 'bg-accent text-white' : 'bg-surface text-ink-muted'}`}
              >
                実写地図
              </button>
            </div>
          </div>

          <SearchFilterBar
            query={query}
            onQueryChange={setQuery}
            prefecture={prefecture}
            onPrefectureChange={setPrefecture}
            prefectures={PREFECTURES}
            unvisitedOnly={unvisitedOnly}
            onUnvisitedOnlyChange={setUnvisitedOnly}
          />

          {view === 'map' ? (
            <Suspense fallback={<div className="h-[70vh] w-full rounded-lg border border-border bg-surface-2" />}>
              <MapView
                stations={visibleOnMap}
                checkedInIds={checkedInIds}
                favorites={favorites}
                userLat={isManualPosition ? undefined : position.lat}
                userLng={isManualPosition ? undefined : position.lng}
                onSelect={onSelect}
              />
            </Suspense>
          ) : (
            <PullToRefresh onRefresh={onStart}>
              {visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">
                  条件に一致する道の駅が見つかりませんでした。
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  {visible.map((s) => (
                    <StationListItem
                      key={s.id}
                      station={s}
                      isCheckedIn={checkedInIds.has(s.id)}
                      isFavorite={favorites.has(s.id)}
                      onSelect={onSelect}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
                </div>
              )}
              {isFiltering && filtered.length > FILTERED_LIMIT && (
                <p className="mt-2 text-center text-xs text-ink-faint">
                  他{filtered.length - FILTERED_LIMIT}件あります。絞り込みを追加してください
                </p>
              )}
            </PullToRefresh>
          )}
        </>
      )}
    </div>
  );
}
