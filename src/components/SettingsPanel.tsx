import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { requestNotificationPermission } from '../lib/notifications';
import { usePreferences, type Skin } from '../lib/PreferencesContext';
import { addProfile, deleteProfile, loadActiveProfileId, loadProfiles, setActiveProfileId } from '../lib/profiles';
import { useTheme } from '../lib/ThemeContext';
import { NewBadge } from './NewBadge';

interface Props {
  onClose: () => void;
}

const SKIN_LABEL: Record<Skin, string> = { default: '標準', roadsign: '道路標識モチーフ' };

export function SettingsPanel({ onClose }: Props) {
  const { preferences, update } = usePreferences();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [profiles, setProfiles] = useState(() => loadProfiles());
  const activeProfileId = loadActiveProfileId();
  const [newProfileName, setNewProfileName] = useState('');

  const switchProfile = (id: string) => {
    setActiveProfileId(id);
    window.location.reload();
  };

  const handleAddProfile = () => {
    if (!newProfileName.trim()) return;
    const next = addProfile(newProfileName.trim());
    setProfiles(next);
    setNewProfileName('');
  };

  const handleDeleteProfile = (id: string, name: string) => {
    if (!window.confirm(`「${name}」を削除しますか？このプロフィールのチェックイン・お気に入りも削除されます`)) return;
    const wasActive = activeProfileId === id;
    const next = deleteProfile(id);
    setProfiles(next);
    if (wasActive) window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">設定</h2>
          <button type="button" onClick={onClose} className="text-sm text-ink-muted">
            閉じる
          </button>
        </div>

        <div className="space-y-6 text-sm">
          <section>
            <div className="mb-2 font-bold">アカウント</div>
            <p className="mb-2 truncate text-xs text-ink-muted">{user?.email}</p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-ink-muted"
            >
              ログアウト
            </button>
          </section>

          <section>
            <div className="mb-2 font-bold">テーマ</div>
            <div className="flex gap-2">
              {(['system', 'light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  aria-pressed={theme === t}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold ${theme === t ? 'border-accent bg-accent-soft text-accent' : 'border-border text-ink-muted'}`}
                >
                  {t === 'system' ? '端末設定' : t === 'light' ? 'ライト' : 'ダーク'}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 font-bold">見た目のスキン</div>
            <div className="flex gap-2">
              {(['default', 'roadsign'] as Skin[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update({ skin: s })}
                  aria-pressed={preferences.skin === s}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold ${preferences.skin === s ? 'border-accent bg-accent-soft text-accent' : 'border-border text-ink-muted'}`}
                >
                  {SKIN_LABEL[s]}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <div className="font-bold">運転・視認性</div>
            <label className="flex items-center justify-between">
              <span>夜間走行モード（低輝度・高コントラスト）</span>
              <input
                type="checkbox"
                checked={preferences.nightMode}
                onChange={(e) => update({ nightMode: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between">
              <span>運転中モード（文字を大きく表示）</span>
              <input
                type="checkbox"
                checked={preferences.drivingMode}
                onChange={(e) => update({ drivingMode: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="flex items-center">
                近づいたら通知（アプリを開いている間のみ）
                <NewBadge featureKey="proximity-alerts" />
              </span>
              <input
                type="checkbox"
                checked={preferences.proximityAlerts}
                onChange={async (e) => {
                  if (e.target.checked) {
                    const granted = await requestNotificationPermission();
                    update({ proximityAlerts: granted });
                  } else {
                    update({ proximityAlerts: false });
                  }
                }}
              />
            </label>
          </section>

          <section className="space-y-2">
            <div className="font-bold">サウンド・振動</div>
            <label className="flex items-center justify-between">
              <span>バイブレーション</span>
              <input
                type="checkbox"
                checked={preferences.hapticsEnabled}
                onChange={(e) => update({ hapticsEnabled: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between">
              <span>チェックイン時の効果音</span>
              <input
                type="checkbox"
                checked={preferences.soundEnabled}
                onChange={(e) => update({ soundEnabled: e.target.checked })}
              />
            </label>
          </section>

          <section className="space-y-2">
            <div className="font-bold">アクセシビリティ</div>
            <label className="flex items-center justify-between">
              <span>文字を大きくする</span>
              <input
                type="checkbox"
                checked={preferences.a11yLargeText}
                onChange={(e) => update({ a11yLargeText: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between">
              <span>コントラストを高くする</span>
              <input
                type="checkbox"
                checked={preferences.a11yHighContrast}
                onChange={(e) => update({ a11yHighContrast: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between">
              <span>タップ領域を大きくする</span>
              <input
                type="checkbox"
                checked={preferences.a11yBigTargets}
                onChange={(e) => update({ a11yBigTargets: e.target.checked })}
              />
            </label>
          </section>

          <section>
            <div className="mb-2 font-bold">プロフィール（家族・グループ切替）</div>
            <p className="mb-2 text-xs text-ink-faint">
              プロフィールごとに別々のスタンプ帳・お気に入りを記録できます。切り替えるとページが再読み込みされます。
            </p>
            <div className="mb-2 space-y-1">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${activeProfileId === p.id ? 'border-accent bg-accent-soft text-accent' : 'border-border'}`}
                >
                  <button
                    type="button"
                    onClick={() => switchProfile(p.id)}
                    aria-pressed={activeProfileId === p.id}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <span aria-hidden="true">{p.emoji}</span>
                    {p.name}
                  </button>
                  {p.id !== 'default' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteProfile(p.id, p.name)}
                      aria-label={`${p.name}を削除`}
                      className="text-xs text-ink-faint underline"
                    >
                      削除
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="新しいプロフィール名"
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={handleAddProfile}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
              >
                追加
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
