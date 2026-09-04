import { useMemo } from 'react';
import { buildAnnualReport } from '../lib/annualReport';
import { ShareButton } from './ShareButton';
import type { CheckinRecord, Station } from '../lib/types';

interface Props {
  checkedStations: (Station & CheckinRecord)[];
}

const MONTH_LABEL = [
  '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月',
];

export function AnnualReportCard({ checkedStations }: Props) {
  const year = new Date().getFullYear();
  const report = useMemo(() => buildAnnualReport(checkedStations, year), [checkedStations, year]);

  if (report.count === 0) return null;

  return (
    <div className="mb-6 rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 text-sm font-bold">{year}年の振り返り</div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-surface-2 p-2">
          <div className="text-lg font-bold">{report.count}</div>
          <div className="text-ink-faint">件チェックイン</div>
        </div>
        <div className="rounded-lg bg-surface-2 p-2">
          <div className="text-lg font-bold">{report.prefectureCount}</div>
          <div className="text-ink-faint">都道府県</div>
        </div>
        <div className="rounded-lg bg-surface-2 p-2">
          <div className="text-lg font-bold">{report.topMonth !== null ? MONTH_LABEL[report.topMonth] : '-'}</div>
          <div className="text-ink-faint">一番よく訪問した月</div>
        </div>
      </div>
      {report.topPrefecture && (
        <p className="mt-3 text-xs text-ink-muted">
          今年最も多く訪れたのは<span className="font-bold text-accent">{report.topPrefecture}</span>でした。
        </p>
      )}
      <div className="mt-3">
        <ShareButton
          headline={`${year}年は${report.count}件チェックイン`}
          subline="道の駅診断・スタンプラリー"
          statLabel="訪問都道府県数"
          statValue={`${report.prefectureCount}都道府県`}
          shareText={`道の駅診断・スタンプラリーで${year}年は${report.count}件チェックイン、${report.prefectureCount}都道府県を訪問しました！ #道の駅診断スタンプラリー`}
          className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-bold text-accent"
          label="今年の記録をシェア"
        />
      </div>
    </div>
  );
}
