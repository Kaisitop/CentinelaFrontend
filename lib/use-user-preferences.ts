"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getUserPreferences,
  setUserPreferences,
  subscribeUserPreferences,
  onUserPreferencesChanged,
  type UserPreferences,
} from "@/lib/user-preferences";

export function useUserPreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(() => getUserPreferences());

  useEffect(() => {
    setPrefs(getUserPreferences());
    const unsubLocal = subscribeUserPreferences(setPrefs);
    const unsubWindow = onUserPreferencesChanged(setPrefs);
    return () => {
      unsubLocal();
      unsubWindow();
    };
  }, []);

  const update = useCallback((partial: Partial<UserPreferences>) => {
    setPrefs(setUserPreferences(partial));
  }, []);

  return { prefs, update };
}

export function useRefreshInterval(callback: () => void, enabled = true) {
  const { prefs } = useUserPreferences();

  useEffect(() => {
    if (!enabled || prefs.refreshIntervalSec <= 0) return;
    const id = setInterval(callback, prefs.refreshIntervalSec * 1000);
    return () => clearInterval(id);
  }, [callback, enabled, prefs.refreshIntervalSec]);
}
