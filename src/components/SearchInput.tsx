import { useState } from 'react';

interface Props {
  query: string;
  onQueryChange: (v: string) => void;
  recentSearches?: string[];
  onCommitSearch?: (v: string) => void;
  pill?: boolean;
}

// 地図の上に浮かせるフローティング検索バー(モバイル)と、デスクトップの左カラム内の検索欄の
// 両方で共有する入力部分。都道府県・設備等の絞り込みはSearchFilterBar側が担当する。
export function SearchInput({ query, onQueryChange, recentSearches = [], onCommitSearch, pill = false }: Props) {
  const [showRecent, setShowRecent] = useState(false);

  return (
    <div className="relative flex-1">
      <input
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={() => setShowRecent(true)}
        onBlur={() => {
          onCommitSearch?.(query);
          setTimeout(() => setShowRecent(false), 120);
        }}
        placeholder="道の駅名で検索"
        aria-label="道の駅名で検索"
        className={`w-full border border-border bg-surface px-4 py-2.5 text-sm ${
          pill ? 'rounded-full shadow-lg' : 'rounded-lg'
        }`}
      />
      {showRecent && !query && recentSearches.length > 0 && (
        <div className="absolute inset-x-0 top-full z-10 mt-1 rounded-lg border border-border bg-surface p-2 shadow-md">
          <div className="mb-1 text-[11px] font-bold text-ink-faint">最近の検索</div>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((term) => (
              <button
                key={term}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onQueryChange(term);
                  setShowRecent(false);
                }}
                className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-ink-muted"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
