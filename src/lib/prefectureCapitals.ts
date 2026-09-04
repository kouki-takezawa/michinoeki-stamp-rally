// 都道府県庁所在地の代表座標（市役所・都道府県庁付近）。地図の都道府県フォーカス用の固定データ。
export interface PrefectureCapital {
  prefecture: string;
  city: string;
  lat: number;
  lng: number;
}

export const PREFECTURE_CAPITALS: PrefectureCapital[] = [
  { prefecture: '北海道', city: '札幌市', lat: 43.0642, lng: 141.3469 },
  { prefecture: '青森県', city: '青森市', lat: 40.8244, lng: 140.74 },
  { prefecture: '岩手県', city: '盛岡市', lat: 39.7036, lng: 141.1527 },
  { prefecture: '宮城県', city: '仙台市', lat: 38.2682, lng: 140.8694 },
  { prefecture: '秋田県', city: '秋田市', lat: 39.7186, lng: 140.1024 },
  { prefecture: '山形県', city: '山形市', lat: 38.2404, lng: 140.3633 },
  { prefecture: '福島県', city: '福島市', lat: 37.7503, lng: 140.4676 },
  { prefecture: '茨城県', city: '水戸市', lat: 36.3418, lng: 140.4468 },
  { prefecture: '栃木県', city: '宇都宮市', lat: 36.5658, lng: 139.8836 },
  { prefecture: '群馬県', city: '前橋市', lat: 36.3911, lng: 139.0608 },
  { prefecture: '埼玉県', city: 'さいたま市', lat: 35.8617, lng: 139.6455 },
  { prefecture: '千葉県', city: '千葉市', lat: 35.6073, lng: 140.1063 },
  { prefecture: '東京都', city: '新宿区', lat: 35.6895, lng: 139.6917 },
  { prefecture: '神奈川県', city: '横浜市', lat: 35.4437, lng: 139.638 },
  { prefecture: '新潟県', city: '新潟市', lat: 37.9022, lng: 139.0232 },
  { prefecture: '富山県', city: '富山市', lat: 36.6953, lng: 137.2113 },
  { prefecture: '石川県', city: '金沢市', lat: 36.5613, lng: 136.6562 },
  { prefecture: '福井県', city: '福井市', lat: 36.0652, lng: 136.2216 },
  { prefecture: '山梨県', city: '甲府市', lat: 35.6642, lng: 138.5686 },
  { prefecture: '長野県', city: '長野市', lat: 36.6513, lng: 138.181 },
  { prefecture: '岐阜県', city: '岐阜市', lat: 35.3912, lng: 136.7223 },
  { prefecture: '静岡県', city: '静岡市', lat: 34.9756, lng: 138.3828 },
  { prefecture: '愛知県', city: '名古屋市', lat: 35.1815, lng: 136.9066 },
  { prefecture: '三重県', city: '津市', lat: 34.7303, lng: 136.5086 },
  { prefecture: '滋賀県', city: '大津市', lat: 35.0045, lng: 135.8686 },
  { prefecture: '京都府', city: '京都市', lat: 35.0116, lng: 135.7681 },
  { prefecture: '大阪府', city: '大阪市', lat: 34.6937, lng: 135.5023 },
  { prefecture: '兵庫県', city: '神戸市', lat: 34.6901, lng: 135.1955 },
  { prefecture: '奈良県', city: '奈良市', lat: 34.6851, lng: 135.8048 },
  { prefecture: '和歌山県', city: '和歌山市', lat: 34.2261, lng: 135.1675 },
  { prefecture: '鳥取県', city: '鳥取市', lat: 35.5039, lng: 134.2378 },
  { prefecture: '島根県', city: '松江市', lat: 35.4723, lng: 133.0505 },
  { prefecture: '岡山県', city: '岡山市', lat: 34.6551, lng: 133.9195 },
  { prefecture: '広島県', city: '広島市', lat: 34.3853, lng: 132.4553 },
  { prefecture: '山口県', city: '山口市', lat: 34.1861, lng: 131.4706 },
  { prefecture: '徳島県', city: '徳島市', lat: 34.0658, lng: 134.5593 },
  { prefecture: '香川県', city: '高松市', lat: 34.3401, lng: 134.0434 },
  { prefecture: '愛媛県', city: '松山市', lat: 33.8416, lng: 132.7657 },
  { prefecture: '高知県', city: '高知市', lat: 33.5597, lng: 133.5311 },
  { prefecture: '福岡県', city: '福岡市', lat: 33.6064, lng: 130.4181 },
  { prefecture: '佐賀県', city: '佐賀市', lat: 33.2494, lng: 130.2988 },
  { prefecture: '長崎県', city: '長崎市', lat: 32.7448, lng: 129.8737 },
  { prefecture: '熊本県', city: '熊本市', lat: 32.7898, lng: 130.7417 },
  { prefecture: '大分県', city: '大分市', lat: 33.2382, lng: 131.6126 },
  { prefecture: '宮崎県', city: '宮崎市', lat: 31.9111, lng: 131.4239 },
  { prefecture: '鹿児島県', city: '鹿児島市', lat: 31.5602, lng: 130.5581 },
  { prefecture: '沖縄県', city: '那覇市', lat: 26.2124, lng: 127.6809 },
];

const BY_PREFECTURE = new Map(PREFECTURE_CAPITALS.map((c) => [c.prefecture, c]));

export function capitalOfPrefecture(prefecture: string): PrefectureCapital | undefined {
  return BY_PREFECTURE.get(prefecture);
}
