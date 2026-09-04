interface Props {
  query: string;
  onQueryChange: (v: string) => void;
  prefecture: string;
  onPrefectureChange: (v: string) => void;
  prefectures: string[];
  unvisitedOnly: boolean;
  onUnvisitedOnlyChange: (v: boolean) => void;
}

export function SearchFilterBar({
  query,
  onQueryChange,
  prefecture,
  onPrefectureChange,
  prefectures,
  unvisitedOnly,
  onUnvisitedOnlyChange,
}: Props) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row">
      <input
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="道の駅名で検索"
        aria-label="道の駅名で検索"
        className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
      <select
        value={prefecture}
        onChange={(e) => onPrefectureChange(e.target.value)}
        aria-label="都道府県で絞り込み"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      >
        <option value="">すべての都道府県</option>
        {prefectures.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm whitespace-nowrap">
        <input
          type="checkbox"
          checked={unvisitedOnly}
          onChange={(e) => onUnvisitedOnlyChange(e.target.checked)}
        />
        未訪問のみ
      </label>
    </div>
  );
}
