import { useState } from 'react';
import { StampMapCanvas } from './StampMap/StampMapCanvas';
import { estimateFuelAndCO2 } from '../lib/fuelEstimate';
import { formatDistance } from '../lib/distance';
import { clearGoal, loadGoal, saveGoal, type Goal } from '../lib/goals';
import type { Origin } from '../lib/journey';
import { findNearCompletion } from '../lib/nearCompletion';
import type { CheckinRecord, Station } from '../lib/types';
import { AnnualReportCard } from './AnnualReportCard';
import { EmptyState } from './EmptyState';
import { FavoritesList } from './FavoritesList';
import { GoalTracker } from './GoalTracker';
import { GourmetCatalog } from './GourmetCatalog';
import { HistoryTimeline } from './HistoryTimeline';
import { ImportExportPanel } from './ImportExportPanel';
import { OriginPicker } from './OriginPicker';
import { PhotoAlbum } from './PhotoAlbum';
import { RecommendedStations } from './RecommendedStations';
import { ShareButton } from './ShareButton';
import { StampBook } from './StampBook';
import { StationGallery } from './StationGallery';
import { TagPieChart } from './TagPieChart';
import { VisitCalendar } from './VisitCalendar';

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
  origin: Origin | null;
  onSetOrigin: (origin: Origin) => void;
  onRemoveOrigin: () => void;
  totalDistanceM: number;
  onExport: () => void;
  onImport: (file: File) => Promise<number>;
  onSelect: (id: string) => void;
}

type PrefView = 'map' | 'stamps' | 'list' | 'gallery';

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
  origin,
  onSetOrigin,
  onRemoveOrigin,
  totalDistanceM,
  onExport,
  onImport,
  onSelect,
}: Props) {
  const [prefView, setPrefView] = useState<PrefView>('map');
  const [goal, setGoalState] = useState<Goal | null>(() => loadGoal());
  const pct = totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100);
  const prefsDone = prefectureProgress.filter((p) => p.done > 0).length;
  const allPrefsComplete = prefectureProgress.length > 0 && prefectureProgress.every((p) => p.done > 0);
  const nearCompletion = findNearCompletion(prefectureProgress);
  const fuel = estimateFuelAndCO2(totalDistanceM);
  const galleryPrefectures = prefectureProgress.map((p) => p.prefecture);

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
          <span className="text-ink-muted">チェックイン中（月1回まで休んでも記録は途切れません）</span>
        </div>
      )}

      {nearCompletion.length > 0 && !allPrefsComplete && (
        <div className="mb-4 rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm">
          {nearCompletion.map((n) => (
            <div key={n.prefecture}>
              🎯 <span className="font-bold">{n.prefecture}</span>まであと
              <span className="font-bold text-accent"> {n.remaining}件</span>で制覇（{n.total - n.remaining}/{n.total}）
            </div>
          ))}
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

      <div className="mb-6 rounded-lg border border-border bg-surface p-4">
        <div className="mb-2 text-sm font-bold">出発地点からの総距離</div>
        <OriginPicker origin={origin} onSet={onSetOrigin} onRemove={onRemoveOrigin} />
        {origin && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-surface-2 p-2">
              <div className="text-base font-bold">{formatDistance(totalDistanceM)}</div>
              <div className="text-ink-faint">総距離(直線)</div>
            </div>
            <div className="rounded-lg bg-surface-2 p-2">
              <div className="text-base font-bold">¥{fuel.costYen.toLocaleString()}</div>
              <div className="text-ink-faint">燃料費目安</div>
            </div>
            <div className="rounded-lg bg-surface-2 p-2">
              <div className="text-base font-bold">{fuel.co2Kg}kg</div>
              <div className="text-ink-faint">CO2排出目安</div>
            </div>
          </div>
        )}
        <p className="mt-2 text-[11px] text-ink-faint">
          道路距離ではなく出発地点から各道の駅までの直線距離の合計です。燃料費・CO2は目安値です。
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-surface p-4">
        <div className="mb-2 text-sm font-bold">目標</div>
        <GoalTracker
          goal={goal}
          currentCount={checkedCount}
          onSet={(g) => {
            saveGoal(g);
            setGoalState(g);
          }}
          onClear={() => {
            clearGoal();
            setGoalState(null);
          }}
        />
      </div>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-bold">
            都道府県別制覇率（{prefsDone} / 47）
          </div>
          <div
            role="group"
            aria-label="都道府県別の表示形式"
            className="flex overflow-hidden rounded-lg border border-border text-xs font-bold"
          >
            {(
              [
                ['map', 'マップ'],
                ['stamps', 'スタンプ帳'],
                ['gallery', '図鑑'],
                ['list', '一覧'],
              ] as [PrefView, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPrefView(key)}
                aria-pressed={prefView === key}
                className={`px-2 py-1 ${prefView === key ? 'bg-accent text-white' : 'bg-surface text-ink-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[1.5fr_1fr] lg:gap-4">
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
          <div>
            <div className={prefView === 'stamps' ? '' : 'hidden'}>
              <StampBook rows={prefectureProgress} />
            </div>
            <div className={prefView === 'gallery' ? '' : 'hidden'}>
              <StationGallery
                stations={stations}
                checkedInIds={checkedInIds}
                prefectures={galleryPrefectures}
                onSelect={onSelect}
              />
            </div>
            <div className={prefView === 'list' ? '' : 'hidden'}>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-border lg:max-h-[62vh]">
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
            {prefView === 'map' && (
              <p className="hidden text-xs text-ink-faint lg:block">
                右側でスタンプ帳・図鑑・一覧を切り替えられます。
              </p>
            )}
          </div>
        </div>
      </div>

      {checkedStations.length > 0 && (
        <>
          <AnnualReportCard checkedStations={checkedStations} />
          <div className="mb-6 rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 text-sm font-bold">訪問の傾向</div>
            <TagPieChart tags={checkedStations.map((s) => s.tag)} />
            <div className="mt-4">
              <div className="mb-1.5 text-xs font-bold text-ink-muted">訪問カレンダー（直近26週）</div>
              <VisitCalendar records={checkedStations} />
            </div>
          </div>
        </>
      )}

      <PhotoAlbum checkedStations={checkedStations} onSelect={onSelect} />

      <GourmetCatalog stations={stations} onSelect={onSelect} />

      <RecommendedStations
        stations={stations}
        checkedStations={checkedStations}
        position={position}
        onSelect={onSelect}
      />

      <div className="mb-6">
        <div className="mb-2 text-sm font-bold">お気に入り（{favorites.size}件）</div>
        <FavoritesList favorites={favorites} checkedInIds={checkedInIds} position={position} onSelect={onSelect} />
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
