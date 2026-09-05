interface LatLng {
  lat: number;
  lng: number;
}

// origin を明示しないと、Google マップ側がブラウザの実際の現在地を改めて取得してしまい、
// アプリ内で表示している現在地（手動選択位置を含む）とズレた地点から経路が引かれてしまう。
// アプリが把握している座標をそのまま origin として渡すことで、これを防ぐ。
export function buildDirectionsUrl(destination: LatLng, origin?: LatLng | null): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.lat},${destination.lng}`,
  });
  if (origin) {
    params.set('origin', `${origin.lat},${origin.lng}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
