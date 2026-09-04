export function Footer() {
  return (
    <footer className="mx-auto max-w-xl px-4 pb-10 pt-4 text-xs leading-relaxed text-ink-faint">
      <p>
        道の駅データ出典：
        <a
          className="underline"
          href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P35.html"
          target="_blank"
          rel="noreferrer"
        >
          国土交通省 国土数値情報（道の駅データ）
        </a>
        、
        <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap contributors
        </a>
        。座標データの集約は
        <a
          className="underline"
          href="https://www.mach-tools.net/map/michinoeki/"
          target="_blank"
          rel="noreferrer"
        >
          マッハーツール
        </a>
        （CC BY 4.0）による全国道の駅座標データを利用しています。
      </p>
      <p className="mt-2">
        本アプリは個人開発の非公式サービスです。営業時間・設備等の最新情報は各道の駅の公式情報をご確認ください。
      </p>
    </footer>
  );
}
