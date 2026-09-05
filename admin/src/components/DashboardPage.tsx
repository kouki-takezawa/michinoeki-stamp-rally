import { useEffect, useState } from 'react';
import { getStats, getTopStations } from '../lib/api';
import { stationLabel } from '../lib/stationNames';
import type { AdminStats, TopStation } from '../lib/types';

const CARDS: { key: keyof AdminStats; label: string }[] = [
  { key: 'total_users', label: '登録ユーザー数' },
  { key: 'signups_7d', label: '直近7日間の新規登録' },
  { key: 'signups_30d', label: '直近30日間の新規登録' },
  { key: 'total_checkins', label: '総チェックイン数' },
  { key: 'total_favorites', label: '総お気に入り数' },
  { key: 'pending_friend_requests', label: '保留中の友達申請' },
];

export function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [topStations, setTopStations] = useState<TopStation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getStats(), getTopStations(15)])
      .then(([s, t]) => {
        setStats(s);
        setTopStations(t);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) return <p className="text-sm text-red-600">読み込みに失敗しました: {error}</p>;
  if (!stats) return <p className="text-sm text-stone-500">読み込み中…</p>;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-4 text-base font-bold text-stone-800">ダッシュボード</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CARDS.map((c) => (
            <div key={c.key} className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs text-stone-500">{c.label}</p>
              <p className="mt-1 text-2xl font-bold text-stone-800">{stats[c.key]}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold text-stone-800">人気の道の駅ランキング</h2>
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {topStations.length === 0 ? (
            <p className="p-4 text-sm text-stone-500">チェックインがまだありません。</p>
          ) : (
            <ol className="divide-y divide-stone-100">
              {topStations.map((t, i) => (
                <li key={t.station_id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="w-5 text-right font-mono text-stone-400">{i + 1}</span>
                  <span className="flex-1 text-stone-700">{stationLabel(t.station_id)}</span>
                  <span className="font-semibold text-stone-800">{t.checkin_count}件</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
