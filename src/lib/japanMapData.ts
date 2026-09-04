import japanMap from '@svg-maps/japan';
import type { ViewBox } from '../hooks/useMapPanZoom';

export interface SvgMapLocation {
  id: string;
  name: string;
  path: string;
}

const map = japanMap as { viewBox: string; locations: SvgMapLocation[] };
const [vbX, vbY, vbW, vbH] = map.viewBox.split(' ').map(Number);

export const JAPAN_BASE_VIEWBOX: ViewBox = { x: vbX, y: vbY, w: vbW, h: vbH };
export const JAPAN_LOCATIONS: SvgMapLocation[] = map.locations;
