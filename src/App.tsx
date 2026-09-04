import { useEffect, useMemo, useRef, useState } from 'react';
import stations from './data/michinoeki.json';
import { DetailOverlay } from './components/DetailOverlay';
import { Footer } from './components/Footer';
import { FriendsScreen } from './components/FriendsScreen';
import { InstallBanner } from './components/InstallBanner';
import { LoginScreen } from './components/LoginScreen';
import { MilestoneModal } from './components/MilestoneModal';
import { MyPage } from './components/MyPage';
import { NearbyScreen } from './components/NearbyScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { StationDetail } from './components/StationDetail';
import { TabBar, type TabKey } from './components/TabBar';
import { SettingsPanel } from './components/SettingsPanel';
import { useCheckins } from './hooks/useCheckins';
import { useFavorites } from './hooks/useFavorites';
import { useGeolocation } from './hooks/useGeolocation';
import { useJourney } from './hooks/useJourney';
import { useAuth } from './lib/AuthContext';
import { celebrateBigMilestone, celebrateCheckin, vibrateFavorite } from './lib/celebrate';
import { reconcileCheckinsToCloud, reconcileFavoritesToCloud } from './lib/cloudSync';
import { distanceMeters, formatDistance } from './lib/distance';
import type { Milestone } from './lib/milestones';
import { hasSeenCoachMark, markCoachMarkSeen } from './lib/coachMarks';
import { hasSeenOnboarding, markOnboardingSeen } from './lib/onboarding';
import { notifyProximity } from './lib/notifications';
import { usePreferences } from './lib/PreferencesContext';
import { recordRecentStation } from './lib/recentActivity';
import { buildShareCanvas, shareImage } from './lib/share';
import { speak } from './lib/speech';
import { useToast } from './lib/ToastContext';
import type { Station } from './lib/types';

const allStations = stations as Station[];
const TAB_STORAGE_KEY = 'michinoeki-active-tab-v1';
const PROXIMITY_THRESHOLD_M = 1000;

function loadTab(): TabKey {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('tab');
    if (fromUrl === 'nearby' || fromUrl === 'mypage' || fromUrl === 'friends') return fromUrl;
    const raw = localStorage.getItem(TAB_STORAGE_KEY);
    if (raw === 'nearby' || raw === 'mypage' || raw === 'friends') return raw;
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
  const { user, loading: authLoading } = useAuth();
  const { position: gpsPosition, status, error, start } = useGeolocation();
  const {
    records,
    checkedInIds,
    checkIn,
    setTag,
    setHasPhoto,
    deleteCheckin,
    undoDeleteCheckin,
    exportJson,
    importJson,
    prefectureProgress,
    checkedStations,
    streak,
    bestDayCount,
    totalCount,
  } = useCheckins();
  const { favorites, toggle: toggleFavorite } = useFavorites();
  const { origin, setOrigin, removeOrigin, totalDistanceM } = useJourney(checkedStations);
  const [showSettings, setShowSettings] = useState(false);
  const { preferences } = usePreferences();

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
    if (preferences.drivingMode) speak('チェックインしました');
    if (milestones.some((m) => m.kind === 'all-prefectures')) {
      celebrateBigMilestone();
    } else {
      celebrateCheckin();
    }
    if (milestones.length > 0) setMilestoneQueue(milestones);
  };

  const handleDeleteCheckin = (id: string) => {
    const removed = deleteCheckin(id);
    if (!removed) return;
    show('チェックインを取り消しました', {
      action: { label: '元に戻す', onClick: () => undoDeleteCheckin(removed) },
    });
  };

  const handleImport = async (file: File) => {
    const count = await importJson(file);
    show(`${count}件のチェックインを取り込みました`, 'success');
    return count;
  };

  const handleToggleFavorite = (id: string) => {
    const wasFavorite = favorites.has(id);
    vibrateFavorite();
    toggleFavorite(id);
    if (wasFavorite) {
      const station = allStations.find((s) => s.id === id);
      show(`${station?.name ?? ''}をお気に入りから削除しました`, {
        action: { label: '元に戻す', onClick: () => toggleFavorite(id) },
      });
    } else if (!hasSeenCoachMark('favorite-toggle')) {
      markCoachMarkSeen('favorite-toggle');
      show('お気に入りに追加しました。☆をもう一度押すと解除できます');
    }
  };

  const currentMilestone = milestoneQueue[0];

  const selectStation = (id: string) => {
    recordRecentStation(id);
    setSelectedId(id);
  };

  // F17: フォアグラウンド限定の近接通知（未訪問の道の駅が1km以内に入ったら1回だけ通知）
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!preferences.proximityAlerts || isManualPosition || !gpsPosition) return;
    for (const s of allStations) {
      if (checkedInIds.has(s.id) || notifiedIdsRef.current.has(s.id)) continue;
      const distanceM = distanceMeters(gpsPosition.lat, gpsPosition.lng, s.lat, s.lng);
      if (distanceM <= PROXIMITY_THRESHOLD_M) {
        notifiedIdsRef.current.add(s.id);
        notifyProximity(s.name, formatDistance(distanceM));
      }
    }
  }, [gpsPosition, isManualPosition, checkedInIds, preferences.proximityAlerts]);

  // ログイン中は、チェックイン・お気に入りの変更をその都度Supabaseへ反映する（友達がスタンプ帳を見られるように）
  useEffect(() => {
    if (!user) return;
    void reconcileCheckinsToCloud(user.id, records);
  }, [user, records]);

  useEffect(() => {
    if (!user) return;
    void reconcileFavoritesToCloud(user.id, favorites);
  }, [user, favorites]);

  // D20: ホーム画面アイコンに連続記録日数をバッジ表示（対応ブラウザのみ。ホームウィジェットの簡易代替）
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (streak > 0) {
      nav.setAppBadge?.(streak).catch(() => {});
    } else {
      nav.clearAppBadge?.().catch(() => {});
    }
  }, [streak]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">読み込み中…</div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

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
            onDeleteCheckin={handleDeleteCheckin}
            onToggleFavorite={handleToggleFavorite}
            onBack={() => setSelectedId(null)}
          />
        </DetailOverlay>
      )}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      <TabBar active={tab} onChange={setTab} onOpenSettings={() => setShowSettings(true)} />
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
          onSelect={selectStation}
        />
      ) : tab === 'mypage' ? (
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
            origin={origin}
            onSetOrigin={setOrigin}
            onRemoveOrigin={removeOrigin}
            totalDistanceM={totalDistanceM}
            onExport={exportJson}
            onImport={handleImport}
            onSelect={selectStation}
          />
          <Footer />
        </div>
      ) : (
        <div className="pb-16 lg:pb-0 lg:pl-56">
          <FriendsScreen />
          <Footer />
        </div>
      )}
    </div>
  );
}

export default App;
