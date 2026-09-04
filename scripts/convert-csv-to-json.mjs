// 道の駅マスターCSV → アプリ用JSONへの変換スクリプト。
// データ更新時（年1〜2回の見直し）は michinoeki_master.csv を差し替えて再実行する。
//   node scripts/convert-csv-to-json.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(dir, 'michinoeki_master.csv');
const outPath = path.join(dir, '..', 'src', 'data', 'michinoeki.json');

const raw = readFileSync(csvPath, 'utf8').replace(/^﻿/, '');
const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
const [header, ...rows] = lines;
const columns = header.split(',');

const stations = rows.map((line) => {
  const cells = line.split(',');
  const record = Object.fromEntries(columns.map((col, i) => [col, cells[i]]));
  return {
    id: record.id,
    name: record.name,
    prefecture: record.prefecture,
    lat: Number(record.latitude),
    lng: Number(record.longitude),
    source: record.source,
  };
});

const idSet = new Set();
for (const s of stations) {
  if (idSet.has(s.id)) throw new Error(`重複ID: ${s.id}`);
  idSet.add(s.id);
  if (Number.isNaN(s.lat) || Number.isNaN(s.lng)) {
    throw new Error(`緯度経度が不正: ${s.id} ${s.name}`);
  }
}

writeFileSync(outPath, JSON.stringify(stations), 'utf8');
console.log(`変換完了: ${stations.length}件 → ${outPath}`);
