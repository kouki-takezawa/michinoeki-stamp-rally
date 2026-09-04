import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Skin = 'default' | 'roadsign';

export interface Preferences {
  skin: Skin;
  nightMode: boolean;
  drivingMode: boolean;
  a11yLargeText: boolean;
  a11yHighContrast: boolean;
  a11yBigTargets: boolean;
  proximityAlerts: boolean;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
}

const DEFAULTS: Preferences = {
  skin: 'default',
  nightMode: false,
  drivingMode: false,
  a11yLargeText: false,
  a11yHighContrast: false,
  a11yBigTargets: false,
  proximityAlerts: false,
  hapticsEnabled: true,
  soundEnabled: true,
};

const STORAGE_KEY = 'michinoeki-preferences-v1';

function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function applyPreferences(prefs: Preferences): void {
  const root = document.documentElement;
  root.dataset.skin = prefs.skin;
  root.dataset.night = String(prefs.nightMode);
  root.dataset.driving = String(prefs.drivingMode);
  root.dataset.a11yLarge = String(prefs.a11yLargeText);
  root.dataset.a11yContrast = String(prefs.a11yHighContrast);
  root.dataset.a11yBig = String(prefs.a11yBigTargets);
}

interface PreferencesContextValue {
  preferences: Preferences;
  update: (patch: Partial<Preferences>) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences());

  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  const update = (patch: Partial<Preferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <PreferencesContext.Provider value={{ preferences, update }}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
