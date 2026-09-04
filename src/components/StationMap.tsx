import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const stationIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const userIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#3d5a73;border:2px solid white;box-shadow:0 0 0 2px rgba(61,90,115,0.4)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

interface Props {
  lat: number;
  lng: number;
  userLat?: number;
  userLng?: number;
}

export function StationMap({ lat, lng, userLat, userLng }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      zoomAnimation: false,
      fadeAnimation: false,
    }).setView([lat, lng], 15);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    L.marker([lat, lng], { icon: stationIcon }).addTo(map);

    if (userLat !== undefined && userLng !== undefined) {
      L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
      const bounds = L.latLngBounds([
        [lat, lng],
        [userLat, userLng],
      ]);
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 16, animate: false });
    }

    return () => {
      map.stop();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, userLat, userLng]);

  return <div ref={containerRef} className="h-56 w-full rounded-lg border border-border" />;
}
