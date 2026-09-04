import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { Station } from '../lib/types';

interface Props {
  stations: Station[];
  checkedInIds: Set<string>;
  favorites: Set<string>;
  userLat?: number;
  userLng?: number;
  onSelect: (id: string) => void;
}

const userIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#3d5a73;border:2px solid white;box-shadow:0 0 0 2px rgba(61,90,115,0.4)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function MapView({ stations, checkedInIds, favorites, userLat, userLng, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { preferCanvas: true }).setView(
      userLat !== undefined && userLng !== undefined ? [userLat, userLng] : [36.2, 138.2],
      userLat !== undefined ? 10 : 5,
    );
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    for (const s of stations) {
      const checkedIn = checkedInIds.has(s.id);
      const favorite = favorites.has(s.id);
      const color = checkedIn ? '#3c7a37' : favorite ? '#c9781f' : '#4a4436';
      const marker = L.circleMarker([s.lat, s.lng], {
        radius: checkedIn || favorite ? 8 : 6,
        color: '#ffffff',
        fillColor: color,
        fillOpacity: 0.9,
        opacity: 1,
        weight: checkedIn || favorite ? 2 : 1.5,
      });
      marker.bindTooltip(s.name, { direction: 'top', offset: [0, -4] });
      marker.on('click', () => onSelect(s.id));
      marker.addTo(layer);
    }

    if (userLat !== undefined && userLng !== undefined) {
      L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, checkedInIds, favorites, userLat, userLng]);

  return <div ref={containerRef} className="h-[70vh] w-full rounded-lg border border-border" />;
}
