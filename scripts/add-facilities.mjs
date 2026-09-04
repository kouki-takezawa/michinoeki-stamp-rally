// 国土交通省 国土数値情報「道の駅データ」(P35) の実測属性（設備フラグ・公式ページURL）を
// src/data/michinoeki.json にマージする。convert-csv-to-json.mjs の後に実行する。
//   node scripts/add-facilities.mjs
//
// P35データは緯度経度が本体データ（マッハーツール集約）とほぼ同一のため、
// 最近傍点マッチング（150m以内）で結合する。P35データは2018年度時点のスナップショットのため、
// それ以降に開業した道の駅には設備情報が付与されない（従来通り出典表記のみになる）。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const geojsonPath = path.join(dir, 'mlit_p35_raw.geojson');
const dataPath = path.join(dir, '..', 'src', 'data', 'michinoeki.json');

const MATCH_THRESHOLD_M = 150;

// P35_011〜P35_028: 1=あり, 2=なし
const FACILITY_FIELDS = [
  ['P35_011', 'ATM'],
  ['P35_012', 'ベビーベッド'],
  ['P35_013', 'レストラン'],
  ['P35_014', '軽食・喫茶'],
  ['P35_015', '宿泊施設'],
  ['P35_016', '温泉'],
  ['P35_017', 'キャンプ場等'],
  ['P35_018', '公園'],
  ['P35_019', '展望台'],
  ['P35_020', '美術館・博物館'],
  ['P35_021', 'ガソリンスタンド'],
  ['P35_022', 'EV充電'],
  ['P35_023', '無線LAN'],
  ['P35_024', 'シャワー'],
  ['P35_025', '体験施設'],
  ['P35_026', '観光案内'],
  ['P35_027', '身障者トイレ'],
  ['P35_028', 'ショップ'],
];

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const mlitFeatures = JSON.parse(readFileSync(geojsonPath, 'utf8')).features;
const stations = JSON.parse(readFileSync(dataPath, 'utf8'));

let matchedCount = 0;
const merged = stations.map((s) => {
  let best = null;
  let bestD = Infinity;
  for (const f of mlitFeatures) {
    const p = f.properties;
    const d = distanceMeters(s.lat, s.lng, p.P35_001, p.P35_002);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  if (!best || bestD > MATCH_THRESHOLD_M) return s;

  matchedCount++;
  const facilities = FACILITY_FIELDS.filter(([field]) => best[field] === 1).map(([, label]) => label);
  const officialUrl = best.P35_007 || undefined;
  return { ...s, facilities, officialUrl };
});

writeFileSync(dataPath, JSON.stringify(merged), 'utf8');
console.log(`設備情報を付与: ${matchedCount} / ${stations.length}件`);
