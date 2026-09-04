export type CoordinateSource = 'mlit' | 'osm' | 'approx';

export interface Station {
  id: string;
  name: string;
  prefecture: string;
  lat: number;
  lng: number;
  source: CoordinateSource;
}

export interface StationWithDistance extends Station {
  distanceM: number;
}

export type CheckinTag = 'rest' | 'meal' | 'onsen' | 'souvenir';

export interface CheckinRecord {
  stationId: string;
  checkedInAt: string;
  tag?: CheckinTag;
  hasPhoto?: boolean;
}

export interface CheckinExport {
  app: 'michinoeki-stamp-rally';
  version: 2;
  exportedAt: string;
  checkins: CheckinRecord[];
  favorites?: string[];
}

export type ThemePreference = 'system' | 'light' | 'dark';
