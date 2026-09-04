import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import type { Station } from '../lib/types';

interface Props {
  stations: Station[];
  checkedInIds: Set<string>;
  favorites: Set<string>;
  userLat?: number;
  userLng?: number;
  highlightedId?: string | null;
  onSelect: (id: string) => void;
}

const DEFAULT_CENTER: [number, number] = [36.2, 138.2];
const DEFAULT_ZOOM = 5;
const CLUSTER_PIXEL_SIZE = 56;

const userIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#3d5a73;border:2px solid white;box-shadow:0 0 0 2px rgba(61,90,115,0.4)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function MapView({ stations, checkedInIds, favorites, userLat, userLng, highlightedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const hasFlownRef = useRef(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  const dataRef = useRef({ stations, checkedInIds, favorites, highlightedId, onSelect });
  dataRef.current = { stations, checkedInIds, favorites, highlightedId, onSelect };
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { preferCanvas: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    mapRef.current = map;

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });
    tiles.on('load', () => setTilesLoaded(true));
    tiles.addTo(map);

    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;

    const redraw = () => {
      const { stations, checkedInIds, favorites, highlightedId, onSelect } = dataRef.current;
      layer.clearLayers();

      type Bucket = { points: Station[]; sumX: number; sumY: number };
      const buckets = new Map<string, Bucket>();
      for (const s of stations) {
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
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
          });
          clusterMarker.addTo(layer);
        }
      }
    };
    redrawRef.current = redraw;

    map.on('moveend zoomend', redraw);
    redraw();

    return () => {
      map.off('moveend zoomend', redraw);
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
    </div>
  );
}
