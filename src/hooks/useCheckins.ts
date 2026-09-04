import { useCallback, useMemo, useState } from 'react';
import stations from '../data/michinoeki.json';
import { detectMilestones, type Milestone } from '../lib/milestones';
import { computePrefectureProgress } from '../lib/progress';
import {
  addCheckin,
  buildExport,
  loadCheckins,
  mergeCheckins,
  parseImport,
  setCheckinHasPhoto,
  setCheckinTag,
} from '../lib/storage';
import { loadFavorites, mergeFavorites } from '../lib/favorites';
import { computeStreak, maxCheckinsInOneDay } from '../lib/streak';
import type { CheckinRecord, CheckinTag, Station } from '../lib/types';

const allStations = stations as Station[];

export function useCheckins() {
  const [records, setRecords] = useState<CheckinRecord[]>(() => loadCheckins());

  const checkedInIds = useMemo(() => new Set(records.map((r) => r.stationId)), [records]);

  const checkIn = useCallback((stationId: string): Milestone[] => {
    const prevList = loadCheckins();
    const prevPrefRows = computePrefectureProgress(prevList, allStations);
    const prevStreak = computeStreak(prevList);

    const nextList = addCheckin(stationId);
    setRecords(nextList);

    const nextPrefRows = computePrefectureProgress(nextList, allStations);
    const nextStreak = computeStreak(nextList);

    return detectMilestones(
      prevList.length,
      nextList.length,
      prevPrefRows,
      nextPrefRows,
      prevStreak,
      nextStreak,
    );
  }, []);

  const setTag = useCallback((stationId: string, tag: CheckinTag) => {
    setRecords(setCheckinTag(stationId, tag));
  }, []);

  const setHasPhoto = useCallback((stationId: string, hasPhoto: boolean) => {
    setRecords(setCheckinHasPhoto(stationId, hasPhoto));
  }, []);

  const exportJson = useCallback(() => {
    const payload = buildExport(records, Array.from(loadFavorites()));
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `michinoeki-checkins-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [records]);

  const importJson = useCallback(async (file: File) => {
    const text = await file.text();
    const { checkins, favorites } = parseImport(text);
    const merged = mergeCheckins(loadCheckins(), checkins);
    setRecords(merged);
    if (favorites.length > 0) mergeFavorites(favorites);
    return checkins.length;
  }, []);

  const prefectureProgress = useMemo(
    () => computePrefectureProgress(records, allStations),
    [records],
  );

  const streak = useMemo(() => computeStreak(records), [records]);
  const bestDayCount = useMemo(() => maxCheckinsInOneDay(records), [records]);

  const checkedStations = useMemo(
    () =>
      records
        .map((r) => {
          const station = allStations.find((s) => s.id === r.stationId);
          return station ? { ...station, ...r } : null;
        })
        .filter(
          (s): s is Station & CheckinRecord => s !== null,
        )
        .sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt)),
    [records],
  );

  return {
    records,
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
    totalCount: allStations.length,
  };
}
