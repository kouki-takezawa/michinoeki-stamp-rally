import { useCallback, useEffect, useRef, useState } from 'react';
import { computeCentroids } from '../lib/prefectureCentroids';
import { PREFECTURE_ID_TO_NAME } from '../lib/prefectureMap';
import { fitProjection, type CalibrationPoint, type Projection } from '../lib/projection';
import type { Station } from '../lib/types';

export function useJapanProjection(stations: Station[]) {
  const pathRefs = useRef(new Map<string, SVGPathElement>());
  const [projection, setProjection] = useState<Projection | null>(null);
  const [prefBBoxes, setPrefBBoxes] = useState<Map<string, DOMRect> | null>(null);

  useEffect(() => {
    const bboxes = new Map<string, DOMRect>();
    for (const [id, el] of pathRefs.current) {
      bboxes.set(id, el.getBBox());
    }
    if (bboxes.size === 0) return;
    setPrefBBoxes(bboxes);

    const geoCentroids = computeCentroids(stations);
    const geoByName = new Map(geoCentroids.map((c) => [c.prefecture, c]));
    const points: CalibrationPoint[] = [];
    for (const [id, bbox] of bboxes) {
      const name = PREFECTURE_ID_TO_NAME[id];
      const geo = name ? geoByName.get(name) : undefined;
      if (!geo) continue;
      points.push({
        lng: geo.lng,
        lat: geo.lat,
        svgX: bbox.x + bbox.width / 2,
        svgY: bbox.y + bbox.height / 2,
      });
    }
    if (points.length >= 6) setProjection(fitProjection(points));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registerPath = useCallback(
    (id: string) => (el: SVGPathElement | null) => {
      if (el) pathRefs.current.set(id, el);
    },
    [],
  );

  return { projection, prefBBoxes, registerPath };
}
