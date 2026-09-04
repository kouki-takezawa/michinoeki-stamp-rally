// 緯度経度 → @svg-maps/japan のviewBox座標系への簡易アフィン変換。
// 都道府県ごとの「実際の重心（道の駅データの平均緯度経度）」と
// 「SVG上でのその都道府県pathの重心（getBBoxで実測）」の対応点から
// 最小二乗法で変換係数を求める。ナビゲーション用の精密な投影ではなく、
// スタンプの位置を都道府県の輪郭内に大まかに落とし込むための近似。

export interface CalibrationPoint {
  lng: number;
  lat: number;
  svgX: number;
  svgY: number;
}

export interface Projection {
  project: (lng: number, lat: number) => { x: number; y: number };
}

// 3x3の正規方程式を解く（ガウスの消去法）
function solve3x3(a: number[][], b: number[]): number[] {
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    [m[col], m[pivot]] = [m[pivot], m[col]];
    const pv = m[col][col];
    if (Math.abs(pv) < 1e-12) continue;
    for (let c = col; c <= 3; c++) m[col][c] /= pv;
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const factor = m[r][col];
      for (let c = col; c <= 3; c++) m[r][c] -= factor * m[col][c];
    }
  }
  return [m[0][3], m[1][3], m[2][3]];
}

function fitLinear(points: CalibrationPoint[], target: 'x' | 'y'): [number, number, number] {
  // target = a*lng + b*lat + c を最小二乗で求める
  let s_ll = 0;
  let s_lp = 0;
  let s_l = 0;
  let s_pp = 0;
  let s_p = 0;
  let s_1 = points.length;
  let s_lt = 0;
  let s_pt = 0;
  let s_t = 0;

  for (const pt of points) {
    const t = target === 'x' ? pt.svgX : pt.svgY;
    s_ll += pt.lng * pt.lng;
    s_lp += pt.lng * pt.lat;
    s_l += pt.lng;
    s_pp += pt.lat * pt.lat;
    s_p += pt.lat;
    s_lt += pt.lng * t;
    s_pt += pt.lat * t;
    s_t += t;
  }

  const A = [
    [s_ll, s_lp, s_l],
    [s_lp, s_pp, s_p],
    [s_l, s_p, s_1],
  ];
  const B = [s_lt, s_pt, s_t];
  return solve3x3(A, B) as [number, number, number];
}

export function fitProjection(points: CalibrationPoint[]): Projection {
  const [ax, bx, cx] = fitLinear(points, 'x');
  const [ay, by, cy] = fitLinear(points, 'y');
  return {
    project: (lng: number, lat: number) => ({
      x: ax * lng + bx * lat + cx,
      y: ay * lng + by * lat + cy,
    }),
  };
}
