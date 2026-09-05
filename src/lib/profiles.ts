const PROFILES_KEY = 'michinoeki-profiles-v1';
const ACTIVE_PROFILE_KEY = 'michinoeki-active-profile-v1';

export interface Profile {
  id: string;
  name: string;
  emoji: string;
}

const DEFAULT_PROFILE: Profile = { id: 'default', name: 'マイ記録', emoji: '🚗' };
const PROFILE_EMOJIS = ['🚗', '🚙', '🚕', '🧑‍🤝‍🧑', '👨‍👩‍👧', '🐶', '🌟', '🎒'];

export function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return [DEFAULT_PROFILE];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore
  }
  return [DEFAULT_PROFILE];
}

function saveProfiles(profiles: Profile[]): void {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // ignore
  }
}

export function addProfile(name: string): Profile[] {
  const profiles = loadProfiles();
  const emoji = PROFILE_EMOJIS[profiles.length % PROFILE_EMOJIS.length];
  const id = `p${Date.now().toString(36)}`;
  const next = [...profiles, { id, name, emoji }];
  saveProfiles(next);
  return next;
}

export function loadActiveProfileId(): string {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_KEY) ?? 'default';
  } catch {
    return 'default';
  }
}

export function setActiveProfileId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  } catch {
    // ignore
  }
}

export function profileScopedKey(base: string, profileId: string = loadActiveProfileId()): string {
  return profileId === 'default' ? base : `${base}:${profileId}`;
}

// データ量効率15: プロフィール削除時に、それに紐づくlocalStorageデータ(チェックイン・お気に入り等)を
// まとめて削除する。profileScopedKeyは常に":<id>"を末尾に付ける規約なので、個々のベースキー名を
// 知らなくても、その接尾辞を持つキーを総なめすれば漏れなく片付けられる。
// (IndexedDB側の写真・グルメメモはそもそもプロフィール単位で分かれていないため対象外)
export function deleteProfile(id: string): Profile[] {
  if (id === 'default') return loadProfiles();

  const remaining = loadProfiles().filter((p) => p.id !== id);
  const next = remaining.length > 0 ? remaining : [DEFAULT_PROFILE];
  saveProfiles(next);

  try {
    const suffix = `:${id}`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.endsWith(suffix)) keysToRemove.push(key);
    }
    for (const key of keysToRemove) localStorage.removeItem(key);
  } catch {
    // ignore
  }

  if (loadActiveProfileId() === id) setActiveProfileId('default');
  return next;
}
