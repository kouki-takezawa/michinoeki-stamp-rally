// 公式ポータル(michi-no-eki.jp)の代表画像URLを取得し、michinoeki.jsonにimageUrlとして付与する。
// add-facilities.mjs の後に実行する。1件ずつ取得キャッシュに保存するため、中断しても再実行すれば
// 未取得分（cache未登録・前回エラー分）だけを再開する。officialUrlが無い駅（2018年度以降開業分）は対象外。
//   node scripts/add-station-images.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(dir, '..', 'src', 'data', 'michinoeki.json');
const cachePath = path.join(dir, 'station-images-cache.json');

const REQUEST_DELAY_MS = 400;
const TIMEOUT_MS = 10000;
// 実測: 代表画像はギャラリー(swiper-container viewGallery__main)内の最初のimgタグに入っている
const IMAGE_PATTERN = /<img[^>]+src="([^"]*styles\/stations_main\/public\/stations\/[^"]+)"/;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchImageUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; michinoeki-stamp-rally-image-fetch/1.0)' },
    });
    if (!res.ok) return { status: 'error', reason: `http ${res.status}` };
    const html = await res.text();
    const match = html.match(IMAGE_PATTERN);
    if (!match) return { status: 'not_found' };
    const src = match[1].startsWith('http') ? match[1] : new URL(match[1], url).toString();
    return { status: 'ok', imageUrl: src };
  } catch (err) {
    return { status: 'error', reason: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

const stations = JSON.parse(readFileSync(dataPath, 'utf8'));
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};

const targets = stations.filter(
  (s) => s.officialUrl && cache[s.id]?.status !== 'ok' && cache[s.id]?.status !== 'not_found',
);
console.log(
  `対象: ${targets.length}件（公式URLあり・未取得分。既存キャッシュ${Object.keys(cache).length}件のうち取得済み/未検出分はスキップ）`,
);

let done = 0;
for (const s of targets) {
  const result = await fetchImageUrl(s.officialUrl);
  cache[s.id] = result;
  done++;
  if (done % 25 === 0 || done === targets.length) {
    writeFileSync(cachePath, JSON.stringify(cache), 'utf8');
    console.log(`${done}/${targets.length} 処理済み`);
  }
  await sleep(REQUEST_DELAY_MS);
}
writeFileSync(cachePath, JSON.stringify(cache), 'utf8');

const okCount = Object.values(cache).filter((c) => c.status === 'ok').length;
const notFoundCount = Object.values(cache).filter((c) => c.status === 'not_found').length;
const errorCount = Object.values(cache).filter((c) => c.status === 'error').length;
console.log(`画像URL取得完了: ok=${okCount} not_found=${notFoundCount} error=${errorCount} / 全${stations.length}件`);

const merged = stations.map((s) => {
  const entry = cache[s.id];
  if (entry?.status === 'ok') return { ...s, imageUrl: entry.imageUrl };
  return s;
});
writeFileSync(dataPath, JSON.stringify(merged), 'utf8');
console.log('michinoeki.jsonへ反映しました');
