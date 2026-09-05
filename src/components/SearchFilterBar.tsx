import { FACILITY_ICON } from '../lib/facilityIcons';

const FACILITY_OPTIONS = Object.keys(FACILITY_ICON);

interface Props {
  prefecture: string;
  onPrefectureChange: (v: string) => void;
  prefectures: string[];
  unvisitedOnly: boolean;
  onUnvisitedOnlyChange: (v: boolean) => void;
  facility?: string;
  onFacilityChange?: (v: string) => void;
}

// テキスト検索欄はSearchInputへ分離済み(地図上に浮かせるため)。ここは都道府県・設備・未訪問の
// 絞り込みコントロールのみを担当する。
export function SearchFilterBar({
  prefecture,
  onPrefectureChange,
  prefectures,
  unvisitedOnly,
  onUnvisitedOnlyChange,
  facility = '',
  onFacilityChange,
}: Props) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
