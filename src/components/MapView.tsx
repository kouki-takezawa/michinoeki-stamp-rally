import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { capitalOfPrefecture } from '../lib/prefectureCapitals';
import type { Station } from '../lib/types';

interface Props {
  stations: Station[];
  focusTarget?: { lat: number; lng: number } | null;
  checkedInIds: Set<string>;
  favorites: Set<string>;
  userLat?: number;
  userLng?: number;
  userAccuracy?: number;
  highlightedId?: string | null;
  onMarkerTap: (id: string | null) => void;
  onRequestLocation: () => void;
}

const DEFAULT_CENTER: [number, number] = [36.2, 138.2];
const DEFAULT_ZOOM = 5;
const PREFECTURE_FOCUS_ZOOM = 10;
const CLUSTER_PIXEL_SIZE = 56;
// このズームより広域(数字より小さい)では、道の駅単位のピクセル格子クラスタではなく
// 都道府県単位で1つの円にまとめる(全国表示で無数の数字が乱雑に並ぶのを防ぐ)
const PREFECTURE_AGGREGATE_MAX_ZOOM = 7;
// GPS精度円は極端に悪い精度(推定位置など)のときに地図全体を覆ってしまわないよう上限を設ける
const MAX_ACCURACY_CIRCLE_M = 500;

const userIconHtml = `
  <div style="position:relative;width:20px;height:20px;">
    <div class="pulse-ring" style="position:absolute;inset:0;border-radius:9999px;background:#3d5a73;"></div>
    <div style="position:absolute;left:3px;top:3px;width:14px;height:14px;border-radius:9999px;background:#3d5a73;border:2px solid white;box-shadow:0 0 0 1px rgba(61,90,115,0.4);"></div>
  </div>
`;
const userIcon = L.divIcon({ className: '', html: userIconHtml, iconSize: [20, 20], iconAnchor: [10, 10] });

export function MapView({
  stations,
  focusTarget,
  checkedInIds,
  favorites,
  userLat,
  userLng,
  userAccuracy,
  highlightedId,
  onMarkerTap,
  onRequestLocation,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const hasFlownRef = useRef(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [tilesRefreshing, setTilesRefreshing] = useState(false);

  const dataRef = useRef({ stations, checkedInIds, favorites, highlightedId, onMarkerTap });
  dataRef.current = { stations, checkedInIds, favorites, highlightedId, onMarkerTap };
  const redrawRef = useRef<() => void>(() => {});
  const redrawFrameRef = useRef<number | null>(null);
  const userPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      preferCanvas: true,
      zoomControl: false,
      // ホイールズームを0.5刻みにして硬いカクつきを減らす(整数刻みだと1段ごとの変化が大きすぎる)
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 100,
    }).setView(
      DEFAULT_CENTER,
      DEFAULT_ZOOM,
    );
    mapRef.current = map;

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });
    tiles.on('load', () => setTilesLoaded(true));
    // ズーム・パンで新しいタイルを読み込み始めるたびに簡易インジケータを出す（初回だけでなく毎回）
    tiles.on('loading', () => setTilesRefreshing(true));
    tiles.on('load', () => setTilesRefreshing(false));
    tiles.addTo(map);

    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;

    // マーカー以外(地図の背景)をタップしたらプレビューを閉じる。Leafletはマーカーのクリックを
    // デフォルトでバブリングさせないため、ここに届くのは背景タップのみ
    map.on('click', () => dataRef.current.onMarkerTap(null));

    const redrawNow = () => {
      const { stations, checkedInIds, favorites, highlightedId, onMarkerTap } = dataRef.current;
      layer.clearLayers();

      if (map.getZoom() <= PREFECTURE_AGGREGATE_MAX_ZOOM) {
        // 全国俯瞰時は道の駅単位のランダムなピクセル格子クラスタだと数字だらけで見づらいため、
        // 都道府県庁所在地に1県1円で集約する(位置が毎回ブレず落ち着いて見える)
        const byPrefecture = new Map<string, Station[]>();
        for (const s of stations) {
          const list = byPrefecture.get(s.prefecture) ?? [];
          list.push(s);
          byPrefecture.set(s.prefecture, list);
        }
        for (const [prefecture, list] of byPrefecture) {
          const capital = capitalOfPrefecture(prefecture);
          if (!capital) continue;
          const anyChecked = list.some((s) => checkedInIds.has(s.id));
          const anyFavorite = list.some((s) => favorites.has(s.id));
          const color = anyChecked ? '#3c7a37' : anyFavorite ? '#c9781f' : '#4a4436';
          const size = Math.min(46, 22 + Math.round(Math.sqrt(list.length) * 6));
          const icon = L.divIcon({
            className: '',
            html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};opacity:0.88;border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:12px;font-family:sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.3)">${list.length}</div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
          const marker = L.marker([capital.lat, capital.lng], { icon });
          marker.bindTooltip(prefecture, { direction: 'top', offset: [0, -4] });
          marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            map.flyTo([capital.lat, capital.lng], PREFECTURE_FOCUS_ZOOM, { duration: 0.6 });
          });
          marker.addTo(layer);
        }
        return;
      }

      // 表示範囲外の駅は座標変換・クラスタリング計算そのものから除外する（ズームインするほど処理対象が減る）
      const bounds = map.getBounds().pad(0.25);
      const visibleStations = stations.filter((s) => bounds.contains([s.lat, s.lng]));

      type Bucket = { points: Station[]; sumX: number; sumY: number };
      const buckets = new Map<string, Bucket>();
      for (const s of visibleStations) {
        const pt = map.latLngToContainerPoint([s.lat, s.lng]);
        const key = `${Math.floor(pt.x / CLUSTER_PIXEL_SIZE)}-${Math.floor(pt.y / CLUSTER_PIXEL_SIZE)}`;
        const bucket = buckets.get(key) ?? { points: [], sumX: 0, sumY: 0 };
        bucket.points.push(s);
        bucket.sumX += s.lat;
        bucket.sumY += s.lng;
        buckets.set(key, bucket);
      }

      for (const bucket of buckets.values()) {
        if (bucket.points.length === 1) {
          const s = bucket.points[0];
          const checked = checkedInIds.has(s.id);
          const favorite = favorites.has(s.id);
          const isHighlighted = highlightedId === s.id;
          const color = checked ? '#3c7a37' : favorite ? '#c9781f' : '#4a4436';
          const marker = L.circleMarker([s.lat, s.lng], {
            radius: isHighlighted ? 10 : checked || favorite ? 8 : 6,
            color: isHighlighted ? '#3d5a73' : '#ffffff',
            fillColor: color,
            fillOpacity: 0.9,
            opacity: 1,
            weight: isHighlighted ? 3 : checked || favorite ? 2 : 1.5,
          });
          marker.bindTooltip(s.name, { direction: 'top', offset: [0, -4] });
          marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onMarkerTap(s.id);
          });
          // PC向け: 右クリックでもプレビューを開く(ブラウザの既定コンテキストメニューは出さない)
          marker.on('contextmenu', (e) => {
            L.DomEvent.stopPropagation(e);
            e.originalEvent.preventDefault();
            onMarkerTap(s.id);
          });
          marker.addTo(layer);
        } else {
          const anyChecked = bucket.points.some((s) => checkedInIds.has(s.id));
          const anyFavorite = bucket.points.some((s) => favorites.has(s.id));
          const color = anyChecked ? '#3c7a37' : anyFavorite ? '#c9781f' : '#4a4436';
          const lat = bucket.sumX / bucket.points.length;
          const lng = bucket.sumY / bucket.points.length;
          const size = Math.min(44, 26 + bucket.points.length);
          const icon = L.divIcon({
            className: '',
            html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};opacity:0.88;border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:12px;font-family:sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.3)">${bucket.points.length}</div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
          const clusterMarker = L.marker([lat, lng], { icon });
          clusterMarker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            const bounds = L.latLngBounds(bucket.points.map((s) => [s.lat, s.lng] as [number, number]));
            map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 16, duration: 0.4 });
          });
          clusterMarker.addTo(layer);
        }
      }
    };

    // 実際の再描画は次フレームに回し、ズーム操作自体をブロックしないようにする
    const redraw = () => {
      if (redrawFrameRef.current !== null) cancelAnimationFrame(redrawFrameRef.current);
      redrawFrameRef.current = requestAnimationFrame(() => {
        redrawFrameRef.current = null;
        redrawNow();
      });
    };
    redrawRef.current = redraw;

    map.on('moveend zoomend', redraw);
    redrawNow();

    // サイドバーの折りたたみ等でコンテナ幅が変わってもLeafletは自動検知しないため、
    // ResizeObserverで気付いてinvalidateSize()する(放置すると見た目のズレやクリック判定のズレが起きる)
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      map.off('moveend zoomend', redraw);
      resizeObserver.disconnect();
      if (redrawFrameRef.current !== null) cancelAnimationFrame(redrawFrameRef.current);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      userMarkerRef.current = null;
      accuracyCircleRef.current = null;
      // 地図インスタンス自体が作り直されるので、新インスタンスではまだ一度も現在地へ
      // flyToしていない状態に戻す(StrictModeの開発時二重マウントで地図が一瞬だけ
      // 作り直された際、古いインスタンス向けのhasFlownフラグが残って新インスタンスでは
      // 二度とflyToされなくなるのを防ぐ)
      hasFlownRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    redrawRef.current();
  }, [stations, checkedInIds, favorites, highlightedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (focusTarget) {
      map.flyTo([focusTarget.lat, focusTarget.lng], PREFECTURE_FOCUS_ZOOM, { duration: 0.8 });
    } else {
      map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userLat === undefined || userLng === undefined) {
      hasFlownRef.current = false;
      userPositionRef.current = null;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      accuracyCircleRef.current?.remove();
      accuracyCircleRef.current = null;
      return;
    }
    userPositionRef.current = { lat: userLat, lng: userLng };

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLat, userLng]);
    } else {
      // interactive:falseにして、駅マーカーと重なったときにクリックが素通りするようにする
      // (現在地マーカー自体はタップ対象ではないため)
      userMarkerRef.current = L.marker([userLat, userLng], {
        icon: userIcon,
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(map);
    }

    const clampedAccuracy =
      userAccuracy !== undefined && Number.isFinite(userAccuracy)
        ? Math.min(userAccuracy, MAX_ACCURACY_CIRCLE_M)
        : null;
    if (clampedAccuracy !== null) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([userLat, userLng]).setRadius(clampedAccuracy);
      } else {
        accuracyCircleRef.current = L.circle([userLat, userLng], {
          radius: clampedAccuracy,
          color: '#3d5a73',
          weight: 1,
          fillColor: '#3d5a73',
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(map);
      }
    } else {
      accuracyCircleRef.current?.remove();
      accuracyCircleRef.current = null;
    }

    if (!hasFlownRef.current) {
      hasFlownRef.current = true;
      map.flyTo([userLat, userLng], 13, { duration: 1.1 });
    }
  }, [userLat, userLng, userAccuracy]);

  const handleLocateClick = () => {
    const map = mapRef.current;
    const pos = userPositionRef.current;
    if (map && pos) {
      map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
    } else {
      onRequestLocation();
    }
  };

  return (
    <div className="relative z-0 h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {!tilesLoaded && (
        <div className="absolute inset-0 animate-pulse bg-surface-2" aria-hidden="true" />
      )}
      {tilesLoaded && tilesRefreshing && (
        <div className="pulse-dot pointer-events-none absolute right-3 top-3 z-10 rounded-full bg-surface/90 px-2 py-1 text-[10px] font-bold text-ink-muted shadow-sm">
          地図を読み込み中…
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex gap-2 rounded-lg bg-surface/90 px-2.5 py-1.5 text-[10px] font-bold text-ink-muted shadow-sm">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border border-ink-faint" aria-hidden="true" />
          未訪問
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#3c7a37]" aria-hidden="true" />
          訪問済み
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#c9781f]" aria-hidden="true" />
          お気に入り
        </span>
      </div>

      <div className="pointer-events-none absolute bottom-[148px] right-3 z-30 flex flex-col items-center gap-2 [&>*]:pointer-events-auto">
        <div className="flex flex-col overflow-hidden rounded-full bg-surface shadow-lg">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="ズームイン"
            title="ズームイン"
            className="flex h-10 w-10 items-center justify-center text-lg font-bold text-ink hover:bg-surface-2"
          >
            +
          </button>
          <div className="h-px w-full bg-border" />
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="ズームアウト"
            title="ズームアウト"
            className="flex h-10 w-10 items-center justify-center text-lg font-bold text-ink hover:bg-surface-2"
          >
            −
          </button>
        </div>
        <button
          type="button"
          onClick={handleLocateClick}
          aria-label="現在地に移動"
          title="現在地に移動"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-accent shadow-lg hover:bg-surface-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <path
              d="M12 2v3M12 19v3M2 12h3M19 12h3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
