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
