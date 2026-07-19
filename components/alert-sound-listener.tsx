"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCentinelaRealtime } from "@/lib/use-centinela-realtime";
import { getUserPreferences, onUserPreferencesChanged } from "@/lib/user-preferences";

function playAlertBeep() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.35);
    oscillator.onended = () => void ctx.close();
  } catch {
    // Navegador sin soporte o sin interacción previa del usuario
  }
}

export function AlertSoundListener() {
  const { isAuthenticated } = useAuth();
  const prefsRef = useRef(getUserPreferences());

  useEffect(() => {
    prefsRef.current = getUserPreferences();
    return onUserPreferencesChanged((prefs) => {
      prefsRef.current = prefs;
    });
  }, []);

  useCentinelaRealtime({
    "alerta.created": () => {
      if (isAuthenticated && prefsRef.current.alertSoundEnabled) {
        playAlertBeep();
      }
    },
  });

  return null;
}
