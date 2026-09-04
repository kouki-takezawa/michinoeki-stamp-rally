import { useState } from 'react';
import { StampMapCanvas } from './StampMap/StampMapCanvas';
import type { CheckinRecord, Station } from '../lib/types';
import { EmptyState } from './EmptyState';
import { FavoritesList } from './FavoritesList';
import { HistoryTimeline } from './HistoryTimeline';
import { ImportExportPanel } from './ImportExportPanel';
import { ShareButton } from './ShareButton';
import { StampBook } from './StampBook';

interface PrefectureRow {
  prefecture: string;
  total: number;
  done: number;
}

interface Props {
  stations: Station[];
  totalCount: number;
  checkedCount: number;
  streak: number;
  bestDayCount: number;
  prefectureProgress: PrefectureRow[];
  checkedStations: (Station & CheckinRecord)[];
  favorites: Set<string>;
  checkedInIds: Set<string>;
  position: { lat: number; lng: number } | null;
  onExport: () => void;
  onImport: (file: File) => Promise<number>;
  onSelect: (id: string) => void;
}

type PrefView = 'map' | 'stamps' | 'list';

export function MyPage({
  stations,
  totalCount,
  checkedCount,
  streak,
  bestDayCount,
  prefectureProgress,
  checkedStations,
  favorites,
  checkedInIds,
  position,
  onExport,
  onImport,
  onSelect,
}: Props) {
  const [prefView, setPrefView] = useState<PrefView>('map');
  const pct = totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100);
  const prefsDone = prefectureProgress.filter((p) => p.done > 0).length;
  const allPrefsComplete = prefectureProgress.length > 0 && prefectureProgress.every((p) => p.done > 0);

  return (
    <div className="mx-auto max-w-xl px-4 py-6 lg:max-w-5xl">
      <div className="mb-1 text-xs font-bold tracking-wide text-accent">MY PAGE</div>
      <h1 className="mb-5 text-2xl font-black">マイページ</h1>

      {streak > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm">
          <span className="text-lg" aria-hidden="true">
            🔥
          </span>
          <span className="font-bold">{streak}日連続</span>
          <span className="text-ink-muted">チェックイン中</span>
        </div>
      )}

      {allPrefsComplete && (
        <div className="mb-4 rounded-lg border border-accent bg-accent-soft p-4 text-center">
          <div className="mb-1 text-2xl">🏆</div>
          <div className="mb-2 font-black text-accent">全都道府県制覇！</div>
          <ShareButton
            headline="全都道府県制覇！"
            subline="道の駅診断・スタンプラリー"
            statLabel="達成都道府県"
            statValue="47 / 47"
            shareText="道の駅診断・スタンプラリーで全都道府県制覇しました！ #道の駅診断スタンプラリー"
            label="達成をシェアする"
          />
        </div>
      )}

      <div className="mb-6 rounded-lg border border-border bg-surface p-4">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-sm font-bold">全国制覇率</span>
          <span className="font-mono text-sm text-ink-muted">
            {checkedCount} / {totalCount}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        {bestDayCount > 1 && (
          <p className="mt-2 text-xs text-ink-faint">自己ベスト：1日で{bestDayCount}件チェックイン</p>
        )}
        <div className="mt-3">
          <ShareButton
            headline={`制覇率 ${pct}%`}
            subline="道の駅診断・スタンプラリー"
            statLabel="チェックイン数"
            statValue={`${checkedCount} / ${totalCount}`}
            shareText={`道の駅診断・スタンプラリーで${checkedCount}件チェックインしました（制覇率${pct}%）！ #道の駅診断スタンプラリー`}
            className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-bold text-accent"
            label="この記録をシェア"
          />
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-bold">
            都道府県別制覇率（{prefsDone} / 47）
          </div>
          <div
            role="group"
            aria-label="都道府県別の表示形式"
            className="flex overflow-hidden rounded-lg border border-border text-xs font-bold lg:hidden"
          >
            {(
              [
                ['map', 'マップ'],
                ['stamps', 'スタンプ帳'],
                ['list', '一覧'],
              ] as [PrefView, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPrefView(key)}
                aria-pressed={prefView === key}
                className={`px-2.5 py-1 ${prefView === key ? 'bg-accent text-white' : 'bg-surface text-ink-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[1.4fr_1fr_0.8fr] lg:gap-4">
          <div className={prefView === 'map' ? '' : 'hidden lg:block'}>
            <StampMapCanvas
              stations={stations}
              checkedInIds={checkedInIds}
              favorites={favorites}
              checkedStations={checkedStations}
              prefectureProgress={prefectureProgress}
              position={position}
              onSelect={onSelect}
            />
          </div>
          <div className={prefView === 'stamps' ? '' : 'hidden lg:block'}>
            <div className="mb-2 hidden text-xs font-bold text-ink-muted lg:block">スタンプ帳</div>
            <StampBook rows={prefectureProgress} />
          </div>
          <div className={prefView === 'list' ? '' : 'hidden lg:block'}>
            <div className="mb-2 hidden text-xs font-bold text-ink-muted lg:block">一覧</div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border lg:max-h-none">
              {prefectureProgress.map((p) => (
                <div
                  key={p.prefecture}
                  className="flex items-center justify-between border-b border-border bg-surface px-4 py-2 text-sm last:border-b-0"
                >
                  <span className={p.done > 0 ? 'font-bold' : 'text-ink-muted'}>{p.prefecture}</span>
                  <span className="font-mono text-xs text-ink-faint">
                    {p.done} / {p.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2 text-sm font-bold">お気に入り（{favorites.size}件）</div>
        <FavoritesList favorites={favorites} checkedInIds={checkedInIds} onSelect={onSelect} />
      </div>

      <div className="mb-6">
        <div className="mb-2 text-sm font-bold">チェックイン履歴（{checkedStations.length}件）</div>
        {checkedStations.length === 0 ? (
          <EmptyState
            emoji="🚗"
            title="まだチェックインした道の駅がありません"
            hint="「近くの道の駅」から探して訪問記録をつけましょう"
          />
        ) : (
          <HistoryTimeline entries={checkedStations} onSelect={onSelect} />
        )}
      </div>

      <ImportExportPanel onExport={onExport} onImport={onImport} />
    </div>
  );
}
