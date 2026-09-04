// 道の駅名（漢字を含むもの）にふりがなを自動付与する。convert-csv-to-json.mjs / add-facilities.mjs の後に実行する。
//   node scripts/add-furigana.mjs
//
// 自動形態素解析（kuroshiro + kuromoji）による読みは、固有の地名では辞書の一般的な読みと
// 異なる場合があり誤りを含みうる。scripts/furigana-overrides.csv に手動の正しい読みを
// 記載しておくと、自動生成結果より優先して採用される。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

const dir = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(dir, '..', 'src', 'data', 'michinoeki.json');
const overridesPath = path.join(dir, 'furigana-overrides.csv');

const KANJI_RE = /[一-龯]/;

function loadOverrides() {
  if (!existsSync(overridesPath)) return new Map();
  const raw = readFileSync(overridesPath, 'utf8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0 && !l.startsWith('#'));
  const map = new Map();
  for (const line of lines.slice(1)) {
    const [id, , kana] = line.split(',');
    if (id && kana) map.set(id.trim(), kana.trim());
  }
  return map;
}

async function main() {
  const stations = JSON.parse(readFileSync(dataPath, 'utf8'));
  const overrides = loadOverrides();

  const KuroshiroCtor = typeof Kuroshiro.default === 'function' ? Kuroshiro.default : Kuroshiro;
  const kuroshiro = new KuroshiroCtor();
  await kuroshiro.init(new KuromojiAnalyzer());

  let generated = 0;
  let overridden = 0;
  for (const s of stations) {
    if (overrides.has(s.id)) {
      s.nameKana = overrides.get(s.id);
      overridden++;
      continue;
    }
    if (!KANJI_RE.test(s.name)) continue;
    try {
      const kana = await kuroshiro.convert(s.name, { to: 'hiragana' });
      s.nameKana = kana;
      generated++;
    } catch {
      // 変換失敗時はふりがな無しのままにする
    }
  }

  writeFileSync(dataPath, JSON.stringify(stations), 'utf8');
  console.log(`ふりがな付与: 自動生成 ${generated}件 / 手動上書き ${overridden}件`);
}

main();
