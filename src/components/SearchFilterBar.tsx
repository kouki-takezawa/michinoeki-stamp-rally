import { useState } from 'react';
import { FACILITY_ICON } from '../lib/facilityIcons';

const FACILITY_OPTIONS = Object.keys(FACILITY_ICON);

interface Props {
  query: string;
  onQueryChange: (v: string) => void;
  prefecture: string;
  onPrefectureChange: (v: string) => void;
  prefectures: string[];
  unvisitedOnly: boolean;
  onUnvisitedOnlyChange: (v: boolean) => void;
  facility?: string;
  onFacilityChange?: (v: string) => void;
  recentSearches?: string[];
  onCommitSearch?: (v: string) => void;
}

export function SearchFilterBar({
  query,
  onQueryChange,
  prefecture,
  onPrefectureChange,
  prefectures,
  unvisitedOnly,
  onUnvisitedOnlyChange,
  facility = '',
  onFacilityChange,
  recentSearches = [],
  onCommitSearch,
}: Props) {
  const [showRecent, setShowRecent] = useState(false);

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
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
      {onFacilityChange && (
        <select
          value={facility}
          onChange={(e) => onFacilityChange(e.target.value)}
          aria-label="設備で絞り込み"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">すべての設備</option>
          {FACILITY_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {FACILITY_ICON[f]} {f}
            </option>
          ))}
        </select>
      )}
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
