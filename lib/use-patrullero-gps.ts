"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { coreService } from "@/lib/core-service";
import { getApiErrorMessage } from "@/lib/api";

const SEND_INTERVAL_MS = 30_000;

export type GpsTrackingState = "idle" | "waiting" | "active" | "denied" | "error";

/**
 * Envía la posición GPS del patrullero al backend cada ~30 s mientras la pestaña está activa.
 */
export function usePatrulleroGpsTracking(
  enabled: boolean,
  nombre?: string | null,
): GpsTrackingState {
  const [state, setState] = useState<GpsTrackingState>(enabled ? "waiting" : "idle");
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);
  const pendingRef = useRef<{ latitud: number; longitud: number; precisionM?: number } | null>(null);
  const nombreRef = useRef(nombre);
  nombreRef.current = nombre;

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !navigator.geolocation) {
      setState("idle");
      return;
    }

    setState("waiting");

    const flush = async (force = false) => {
      const pending = pendingRef.current;
      if (!pending) return;

      const now = Date.now();
      if (!force && now - lastSentRef.current < SEND_INTERVAL_MS) return;

      lastSentRef.current = now;
      try {
        await coreService.updatePosicionPatrullero({
          ...pending,
          nombre: nombreRef.current ?? undefined,
        });
        setState("active");
      } catch (err) {
        lastSentRef.current = 0;
        setState("error");
        if (force) {
          toast.error(`No se pudo compartir GPS: ${getApiErrorMessage(err)}`);
        }
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        pendingRef.current = {
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude,
          precisionM: pos.coords.accuracy,
        };
        void flush(true);
      },
      (geoErr) => {
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setState("denied");
          toast.error("Activa la ubicación del navegador para aparecer en el mapa del operador");
        } else {
          setState("error");
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );

    const interval = setInterval(() => void flush(false), SEND_INTERVAL_MS);

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      clearInterval(interval);
    };
  }, [enabled]);

  return state;
}
