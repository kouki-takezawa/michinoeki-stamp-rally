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
  highlightedId?: string | null;
  onSelect: (id: string) => void;
}

const DEFAULT_CENTER: [number, number] = [36.2, 138.2];
const DEFAULT_ZOOM = 5;
const PREFECTURE_FOCUS_ZOOM = 10;
const CLUSTER_PIXEL_SIZE = 56;
// このズームより広域(数字より小さい)では、道の駅単位のピクセル格子クラスタではなく
// 都道府県単位で1つの円にまとめる(全国表示で無数の数字が乱雑に並ぶのを防ぐ)
const PREFECTURE_AGGREGATE_MAX_ZOOM = 7;

const userIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#3d5a73;border:2px solid white;box-shadow:0 0 0 2px rgba(61,90,115,0.4)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function MapView({
  stations,
  focusTarget,
  checkedInIds,
  favorites,
  userLat,
  userLng,
  highlightedId,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const hasFlownRef = useRef(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [tilesRefreshing, setTilesRefreshing] = useState(false);

  const dataRef = useRef({ stations, checkedInIds, favorites, highlightedId, onSelect });
  dataRef.current = { stations, checkedInIds, favorites, highlightedId, onSelect };
  const redrawRef = useRef<() => void>(() => {});
  const redrawFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { preferCanvas: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
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

    const redrawNow = () => {
      const { stations, checkedInIds, favorites, highlightedId, onSelect } = dataRef.current;
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
          marker.on('click', () => {
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
          marker.on('click', () => onSelect(s.id));
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
          clusterMarker.on('click', () => {
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

    return () => {
      map.off('moveend zoomend', redraw);
      if (redrawFrameRef.current !== null) cancelAnimationFrame(redrawFrameRef.current);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      userMarkerRef.current = null;
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
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLat, userLng]);
    } else {
      userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
    }
    if (!hasFlownRef.current) {
      hasFlownRef.current = true;
      map.flyTo([userLat, userLng], 13, { duration: 1.1 });
    }
  }, [userLat, userLng]);

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
    </div>
  );
}
