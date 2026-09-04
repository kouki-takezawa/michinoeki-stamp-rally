import { useMemo, useState } from 'react';
import stations from './data/michinoeki.json';
import { DetailOverlay } from './components/DetailOverlay';
import { Footer } from './components/Footer';
import { InstallBanner } from './components/InstallBanner';
import { MilestoneModal } from './components/MilestoneModal';
import { MyPage } from './components/MyPage';
import { NearbyScreen } from './components/NearbyScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { StationDetail } from './components/StationDetail';
import { TabBar, type TabKey } from './components/TabBar';
import { useCheckins } from './hooks/useCheckins';
import { useFavorites } from './hooks/useFavorites';
import { useGeolocation } from './hooks/useGeolocation';
import { celebrateBigMilestone, celebrateCheckin } from './lib/celebrate';
import { distanceMeters } from './lib/distance';
import type { Milestone } from './lib/milestones';
import { hasSeenOnboarding, markOnboardingSeen } from './lib/onboarding';
import { buildShareCanvas, shareImage } from './lib/share';
import { useToast } from './lib/ToastContext';
import type { Station } from './lib/types';

const allStations = stations as Station[];
const TAB_STORAGE_KEY = 'michinoeki-active-tab-v1';

function loadTab(): TabKey {
  try {
    const raw = localStorage.getItem(TAB_STORAGE_KEY);
    if (raw === 'nearby' || raw === 'mypage') return raw;
  } catch {
    // ignore
  }
  return 'nearby';
}

const MILESTONE_SHARE: Record<Milestone['kind'], (m: Milestone) => { headline: string; text: string }> = {
  first: () => ({ headline: '初チェックイン達成', text: '道の駅診断・スタンプラリーで初チェックインしました！' }),
  count: (m) => ({
    headline: `${m.kind === 'count' ? m.count : ''}件チェックイン`,
    text: `道の駅診断・スタンプラリーで累計${m.kind === 'count' ? m.count : ''}件チェックインしました！`,
  }),
  'prefecture-complete': (m) => ({
    headline: `${m.kind === 'prefecture-complete' ? m.prefecture : ''}制覇`,
    text: `道の駅診断・スタンプラリーで${m.kind === 'prefecture-complete' ? m.prefecture : ''}の道の駅を制覇しました！`,
  }),
  'region-complete': (m) => ({
    headline: `${m.kind === 'region-complete' ? m.region : ''}ブロック制覇`,
    text: `道の駅診断・スタンプラリーで${m.kind === 'region-complete' ? m.region : ''}地方を制覇しました！`,
  }),
  'all-prefectures': () => ({
    headline: '全都道府県制覇',
    text: '道の駅診断・スタンプラリーで全都道府県制覇しました！',
  }),
  streak: (m) => ({
    headline: `${m.kind === 'streak' ? m.days : ''}日連続`,
    text: `道の駅診断・スタンプラリーで${m.kind === 'streak' ? m.days : ''}日連続チェックインを達成しました！`,
  }),
};

function App() {
  const [tab, setTabState] = useState<TabKey>(loadTab);
  const setTab = (next: TabKey) => {
    setTabState(next);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());
  const [manualPosition, setManualPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [milestoneQueue, setMilestoneQueue] = useState<Milestone[]>([]);

  const { show } = useToast();
  const { position: gpsPosition, status, error, start } = useGeolocation();
  const {
    checkedInIds,
    checkIn,
    setTag,
    setHasPhoto,
    exportJson,
    importJson,
    prefectureProgress,
    checkedStations,
    streak,
    bestDayCount,
    totalCount,
  } = useCheckins();
  const { favorites, toggle: toggleFavorite } = useFavorites();

  const isManualPosition = manualPosition !== null;
  const position = useMemo(
    () =>
      manualPosition
        ? { lat: manualPosition.lat, lng: manualPosition.lng, accuracy: Number.POSITIVE_INFINITY }
        : gpsPosition,
    [manualPosition, gpsPosition],
  );

  const selectedStation = useMemo(
    () => allStations.find((s) => s.id === selectedId) ?? null,
    [selectedId],
  );

  const selectedDistance = useMemo(() => {
    if (!selectedStation || !position) return null;
    return distanceMeters(position.lat, position.lng, selectedStation.lat, selectedStation.lng);
  }, [selectedStation, position]);

  const selectedRecord = useMemo(
    () => checkedStations.find((s) => s.id === selectedId),
    [checkedStations, selectedId],
  );

  const handleCheckIn = (id: string) => {
    const milestones = checkIn(id);
    show('チェックインしました！', 'success');
    if (milestones.some((m) => m.kind === 'all-prefectures')) {
      celebrateBigMilestone();
    } else {
      celebrateCheckin();
    }
    if (milestones.length > 0) setMilestoneQueue(milestones);
  };

  const handleImport = async (file: File) => {
    const count = await importJson(file);
    show(`${count}件のチェックインを取り込みました`, 'success');
    return count;
  };

  const handleToggleFavorite = (id: string) => {
    const wasFavorite = favorites.has(id);
    toggleFavorite(id);
    if (wasFavorite) {
      const station = allStations.find((s) => s.id === id);
      show(`${station?.name ?? ''}をお気に入りから削除しました`, {
        action: { label: '元に戻す', onClick: () => toggleFavorite(id) },
      });
    }
  };

  const currentMilestone = milestoneQueue[0];

  return (
    <div className="min-h-screen bg-bg text-ink">
      {showOnboarding && (
        <OnboardingModal
          onFinish={() => {
            markOnboardingSeen();
            setShowOnboarding(false);
          }}
        />
      )}

      {currentMilestone && (
        <MilestoneModal
          milestone={currentMilestone}
          onClose={() => setMilestoneQueue((q) => q.slice(1))}
          onShare={() => {
            const { headline, text } = MILESTONE_SHARE[currentMilestone.kind](currentMilestone);
            const canvas = buildShareCanvas({
              headline,
              subline: '道の駅診断・スタンプラリー',
              statLabel: '達成',
              statValue: headline,
            });
            void shareImage(canvas, text);
          }}
        />
      )}

      {selectedStation && (
        <DetailOverlay onClose={() => setSelectedId(null)}>
          <StationDetail
            station={selectedStation}
            distanceM={selectedDistance}
            position={position}
            isManualPosition={isManualPosition}
            isCheckedIn={checkedInIds.has(selectedStation.id)}
            checkedInAt={selectedRecord?.checkedInAt}
            tag={selectedRecord?.tag}
            isFavorite={favorites.has(selectedStation.id)}
            onCheckIn={handleCheckIn}
            onSetTag={setTag}
            onSetHasPhoto={setHasPhoto}
            onToggleFavorite={handleToggleFavorite}
            onBack={() => setSelectedId(null)}
          />
        </DetailOverlay>
      )}

      <TabBar active={tab} onChange={setTab} />
      {tab === 'nearby' ? (
        <NearbyScreen
          position={position}
          isManualPosition={isManualPosition}
          status={status}
          error={error}
          onStart={() => {
            setManualPosition(null);
            start();
          }}
          onManualPick={(lat, lng) => setManualPosition({ lat, lng })}
          onClearManual={() => {
            setManualPosition(null);
            start();
          }}
          checkedInIds={checkedInIds}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onSelect={setSelectedId}
        />
      ) : (
        <div className="pb-16 lg:pb-0 lg:pl-56">
          <InstallBanner />
          <MyPage
            stations={allStations}
            totalCount={totalCount}
            checkedCount={checkedInIds.size}
            streak={streak}
            bestDayCount={bestDayCount}
            prefectureProgress={prefectureProgress}
            checkedStations={checkedStations}
            favorites={favorites}
            checkedInIds={checkedInIds}
            position={isManualPosition ? null : position}
            onExport={exportJson}
            onImport={handleImport}
            onSelect={setSelectedId}
          />
          <Footer />
        </div>
      )}
    </div>
  );
}

export default App;
