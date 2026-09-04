// F13/G07: 地方ごとの豆知識・マナーコラム。特定の道の駅個別の情報ではなく、
// 誤りのリスクを避けるため一般的によく知られた地方単位の知識に絞っている。
interface TriviaEntry {
  region: string;
  text: string;
}

const TRIVIA: TriviaEntry[] = [
  { region: '北海道', text: '北海道は日本の都道府県で最も面積が広く、道の駅の数も全国最多クラスです。' },
  { region: '東北', text: '東北6県は初夏から夏にかけて、ねぶた祭や竿燈まつりなど各地で夏祭りが行われます。' },
  { region: '関東', text: '関東地方は日本の総人口の3割以上が集中する、国内最大の都市圏です。' },
  { region: '中部', text: '中部地方には日本アルプスと呼ばれる飛騨・木曽・赤石の3つの山脈があります。' },
  { region: '近畿', text: '近畿地方は古くから「畿内」と呼ばれ、長らく日本の政治・文化の中心でした。' },
  { region: '中国', text: '中国地方は日本海側と瀬戸内側で気候が大きく異なり、山陰・山陽と呼び分けられます。' },
  { region: '四国', text: '四国は4つの県からなり、四国八十八ヶ所巡り（お遍路）で知られています。' },
  {
    region: '九州・沖縄',
    text: '沖縄県は日本で最も南に位置し、亜熱帯性気候で独自の文化・食文化が育まれてきました。',
  },
  { region: '道の駅', text: '道の駅は1993年に第1回登録が始まった制度で、2024年時点で全国1,200駅を超えています。' },
  {
    region: '運転マナー',
    text: '道の駅は休憩施設です。無料だからといって長時間の連泊や大量のゴミの放置は避け、次に使う人のことを考えて利用しましょう。',
  },
];

export function pickTrivia(preferredRegion?: string): TriviaEntry {
  if (preferredRegion && Math.random() < 0.6) {
    const matches = TRIVIA.filter((t) => t.region === preferredRegion);
    if (matches.length > 0) return matches[Math.floor(Math.random() * matches.length)];
  }
  return TRIVIA[Math.floor(Math.random() * TRIVIA.length)];
}
