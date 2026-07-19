export type RefreshIntervalSec = 0 | 30 | 60;
export type GpsIntervalSec = 15 | 30 | 60;

export interface UserPreferences {
  mapShowZonas: boolean;
  mapShowNodos: boolean;
  mapShowAlertas: boolean;
  alertSoundEnabled: boolean;
  refreshIntervalSec: RefreshIntervalSec;
  gpsSharingEnabled: boolean;
  gpsIntervalSec: GpsIntervalSec;
}

const STORAGE_KEY = "centinela_user_prefs";

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  mapShowZonas: true,
  mapShowNodos: true,
  mapShowAlertas: true,
  alertSoundEnabled: true,
  refreshIntervalSec: 60,
  gpsSharingEnabled: true,
  gpsIntervalSec: 30,
};

type PreferenceListener = (prefs: UserPreferences) => void;
const listeners = new Set<PreferenceListener>();

function notifyListeners(prefs: UserPreferences) {
  listeners.forEach((fn) => fn(prefs));
}

function readStored(): Partial<UserPreferences> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<UserPreferences>;
  } catch {
    return null;
  }
}

export function getUserPreferences(): UserPreferences {
  const stored = readStored();
  return { ...DEFAULT_USER_PREFERENCES, ...stored };
}

export function setUserPreferences(partial: Partial<UserPreferences>): UserPreferences {
  const next = { ...getUserPreferences(), ...partial };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("centinela:prefs-changed", { detail: next }));
  }
  notifyListeners(next);
  return next;
}

export function subscribeUserPreferences(listener: PreferenceListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function onUserPreferencesChanged(
  handler: (prefs: UserPreferences) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const storageHandler = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) handler(getUserPreferences());
  };

  const customHandler = (event: Event) => {
    handler((event as CustomEvent<UserPreferences>).detail ?? getUserPreferences());
  };

  window.addEventListener("storage", storageHandler);
  window.addEventListener("centinela:prefs-changed", customHandler);

  return () => {
    window.removeEventListener("storage", storageHandler);
    window.removeEventListener("centinela:prefs-changed", customHandler);
  };
}
