// F20: 電波が弱いエリアでも地図が使えるよう、Service Workerのタイルキャッシュ（vite.config.tsのosm-tiles）に
// 現在地周辺のタイルを事前に読み込んでおく。サーバー側の変更は不要（既存のCacheFirst設定に載せるだけ）。
const SUBDOMAINS = ['a', 'b', 'c'];
const ZOOM_LEVELS = [12, 13, 14, 15];
const TILE_RADIUS = 3;

function lngLatToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x: ((x % n) + n) % n, y: Math.min(Math.max(y, 0), n - 1) };
}

function tileUrls(lat: number, lng: number): string[] {
  const urls: string[] = [];
  let subdomainIndex = 0;
  for (const zoom of ZOOM_LEVELS) {
    const { x: cx, y: cy } = lngLatToTile(lat, lng, zoom);
    for (let dx = -TILE_RADIUS; dx <= TILE_RADIUS; dx++) {
      for (let dy = -TILE_RADIUS; dy <= TILE_RADIUS; dy++) {
        const s = SUBDOMAINS[subdomainIndex % SUBDOMAINS.length];
        subdomainIndex++;
        urls.push(`https://${s}.tile.openstreetmap.org/${zoom}/${cx + dx}/${cy + dy}.png`);
      }
    }
  }
  return urls;
}

export interface PrecacheProgress {
  done: number;
  total: number;
}

export async function precacheAreaTiles(
  lat: number,
  lng: number,
  onProgress?: (p: PrecacheProgress) => void,
): Promise<void> {
  const urls = tileUrls(lat, lng);
  let done = 0;
  const CONCURRENCY = 6;
  let cursor = 0;

  async function worker() {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      try {
        await fetch(url, { mode: 'cors' });
      } catch {
        // オフラインや読み込み失敗のタイルはスキップ
      }
      done++;
      onProgress?.({ done, total: urls.length });
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}
