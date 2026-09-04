import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { evaluateCheckin } from '../lib/checkin';
import { formatDistance } from '../lib/distance';
import { estimateEta } from '../lib/eta';
import { FACILITY_ICON } from '../lib/facilityIcons';
import { usePreferences } from '../lib/PreferencesContext';
import { formatRelativeTime } from '../lib/relativeTime';
import { regionOfPrefecture } from '../lib/regions';
import { speak } from '../lib/speech';
import { pickTrivia } from '../lib/trivia';
import { weatherEmoji } from '../lib/weather';
import { useWeather } from '../hooks/useWeather';
import type { GeoPosition } from '../hooks/useGeolocation';
import type { CheckinTag, Station } from '../lib/types';
import { GourmetNoteInput } from './GourmetNoteInput';
import { PhotoPicker } from './PhotoPicker';
import { PlanVisitButton } from './PlanVisitButton';
import { ShareButton } from './ShareButton';
import { StationName } from './StationName';
import { TagPicker } from './TagPicker';

const StationMap = lazy(() => import('./StationMap').then((m) => ({ default: m.StationMap })));

const REASON_MESSAGE: Record<string, string> = {
  'no-position': '現在地を取得できていません',
  'low-accuracy': '位置情報の精度が低いため、電波の良い場所で再取得してください',
  'too-far': 'この道の駅から300m以内に近づくとチェックインできます',
};

interface Props {
  station: Station;
  distanceM: number | null;
  position: GeoPosition | null;
  isManualPosition: boolean;
  isCheckedIn: boolean;
  checkedInAt?: string;
  tag?: CheckinTag;
  isFavorite: boolean;
  onCheckIn: (id: string) => void;
  onSetTag: (id: string, tag: CheckinTag) => void;
  onSetHasPhoto: (id: string, hasPhoto: boolean) => void;
  onToggleFavorite: (id: string) => void;
  onBack: () => void;
}

const SOURCE_LABEL: Record<Station['source'], string> = {
  mlit: '国土数値情報',
  osm: 'OpenStreetMap',
  approx: '概算値',
};

export function StationDetail({
  station,
  distanceM,
  position,
  isManualPosition,
  isCheckedIn,
  checkedInAt,
  tag,
  isFavorite,
  onCheckIn,
  onSetTag,
  onSetHasPhoto,
  onToggleFavorite,
  onBack,
}: Props) {
  const accuracy = isManualPosition ? null : (position?.accuracy ?? null);
  const { eligible, reason } = evaluateCheckin(
    distanceM,
    isManualPosition ? Number.POSITIVE_INFINITY : accuracy,
  );
  const eta = distanceM !== null ? estimateEta(distanceM) : null;
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
  const [trivia, setTrivia] = useState(() => pickTrivia(regionOfPrefecture(station.prefecture)?.name));
  useEffect(() => {
    setTrivia(pickTrivia(regionOfPrefecture(station.prefecture)?.name));
  }, [station.id, station.prefecture]);
  const weather = useWeather(station.lat, station.lng);
  const { preferences } = usePreferences();

  const lastSpokenIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!preferences.drivingMode || lastSpokenIdRef.current === station.id) return;
    lastSpokenIdRef.current = station.id;
    const distanceText = distanceM !== null ? `、現在地から${formatDistance(distanceM)}` : '';
    speak(`${station.name}${distanceText}`);
  }, [station.id, station.name, distanceM, preferences.drivingMode]);

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-ink-muted hover:text-ink">
          ← 一覧に戻る
        </button>
        <button
          type="button"
          onClick={() => onToggleFavorite(station.id)}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? 'お気に入りから外す' : 'お気に入りに追加'}
          className={`text-2xl ${isFavorite ? 'text-amber-500' : 'text-ink-faint'}`}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>

      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-bold tracking-wide text-accent">{station.prefecture}</span>
        {weather && (
          <span className="flex items-center gap-1 text-xs font-bold text-ink-muted">
            <span aria-hidden="true">{weatherEmoji(weather.weatherCode)}</span>
            {Math.round(weather.temperatureC)}°C
          </span>
        )}
      </div>
      <h1 className="mb-4 text-2xl font-black">
        <StationName name={station.name} nameKana={station.nameKana} />
      </h1>
      {weather?.isRain && (
        <p className="mb-3 rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-muted">
          🌧️ 雨の予報です。屋内の休憩スペースがある施設か事前に確認しておくと安心です。
        </p>
      )}

      <Suspense fallback={<div className="h-56 w-full rounded-lg border border-border bg-surface-2" />}>
        <StationMap
          lat={station.lat}
          lng={station.lng}
          userLat={isManualPosition ? undefined : position?.lat}
          userLng={isManualPosition ? undefined : position?.lng}
        />
      </Suspense>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={navUrl}
          target="_blank"
          rel="noreferrer"
          className="block rounded-lg border border-border bg-surface py-2.5 text-center text-sm font-bold text-accent"
        >
          📍 経路を見る
        </a>
        {station.officialUrl ? (
          <a
            href={station.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-border bg-surface py-2.5 text-center text-sm font-bold text-accent"
          >
            🖼️ 写真・詳細（公式）
          </a>
        ) : (
          <span className="flex items-center justify-center rounded-lg border border-dashed border-border py-2.5 text-center text-xs text-ink-faint">
            公式ページ情報なし
          </span>
        )}
      </div>

      {station.facilities && station.facilities.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-bold text-ink-muted">設備</div>
          <div className="flex flex-wrap gap-1.5">
            {station.facilities.map((f) => (
              <span
                key={f}
                className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-bold text-ink-muted"
              >
                <span aria-hidden="true">{FACILITY_ICON[f] ?? '・'}</span> {f}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-border bg-accent-soft/50 p-3 text-sm">
        <div className="mb-1 text-xs font-bold text-accent">💡 {trivia.region}の豆知識</div>
        <p className="text-ink-muted">{trivia.text}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center gap-1.5 text-ink-faint">
            現在地からの距離
            {!isManualPosition && distanceM !== null && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-accent">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
                LIVE
              </span>
            )}
          </div>
          <div className="text-lg font-bold tabular-nums">
            {distanceM !== null ? formatDistance(distanceM) : '取得中…'}
          </div>
          {eta && (
            <div className="mt-0.5 text-xs text-ink-faint">
              徒歩{eta.walk} ・ 車{eta.drive}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="text-ink-faint">位置情報の精度</div>
          <div className="text-lg font-bold">
            {isManualPosition ? '推定' : accuracy !== null ? `±${Math.round(accuracy)}m` : '取得中…'}
          </div>
        </div>
      </div>

      {!isCheckedIn && (
        <div className="mt-3">
          <PlanVisitButton stationName={station.name} prefecture={station.prefecture} />
        </div>
      )}

      <div className="mt-6">
        {isCheckedIn ? (
          <div className="rounded-lg bg-accent-soft px-4 py-3 text-center font-bold text-accent">
            ✓ チェックイン済み
            {checkedInAt && (
              <span className="ml-2 font-normal text-ink-muted">
                （{formatRelativeTime(checkedInAt)}）
              </span>
            )}
          </div>
        ) : (
          <>
            <button
              type="button"
              disabled={!eligible}
              onClick={() => onCheckIn(station.id)}
              className="w-full rounded-lg bg-accent py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-border disabled:text-ink-faint"
            >
              チェックインする
            </button>
            {!eligible && (
              <p className="mt-2 text-center text-xs text-ink-muted">
                {isManualPosition ? '推定位置ではチェックインできません。GPSで現在地を取得してください' : REASON_MESSAGE[reason]}
              </p>
            )}
          </>
        )}
        <p className="mt-3 text-center text-xs text-ink-faint">
          チェックインは距離300m以内・位置情報の自己申告に基づく簡易判定です。厳密な不正防止は行っていません。
        </p>
      </div>

      {isCheckedIn && (
        <div className="mt-6 space-y-4 border-t border-border pt-6">
          <div>
            <div className="mb-2 text-sm font-bold">訪問メモ</div>
            <TagPicker value={tag} onChange={(t) => onSetTag(station.id, t)} />
          </div>
          <div>
            <PhotoPicker stationId={station.id} onChange={(has) => onSetHasPhoto(station.id, has)} />
          </div>
          <GourmetNoteInput stationId={station.id} />
          <ShareButton
            headline={`${station.name}にチェックイン`}
            subline={station.prefecture}
            statLabel="訪問メモ"
            statValue={tag ? { rest: '☕ 休憩', meal: '🍚 食事', onsen: '♨️ 温泉', souvenir: '🎁 お土産' }[tag] : '訪問記録'}
            shareText={`「${station.name}」(${station.prefecture})にチェックインしました！ #道の駅診断スタンプラリー`}
            className="w-full rounded-lg border border-border bg-surface py-2.5 text-sm font-bold text-accent"
            label="この訪問をシェア"
          />
        </div>
      )}

      <p className="mt-8 text-xs text-ink-faint">
        座標データ出典：{SOURCE_LABEL[station.source]}（国土数値情報 道の駅データを基本とし、OpenStreetMap等で補完）
      </p>
    </div>
  );
}
