"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { coreService } from "@/lib/core-service";
import { getApiErrorMessage } from "@/lib/api";

const DEFAULT_SEND_INTERVAL_MS = 30_000;

export type GpsTrackingState = "idle" | "waiting" | "active" | "denied" | "error";

export type GpsErrorKind = "api" | "geo" | null;

export interface GpsTrackingResult {
  state: GpsTrackingState;
  errorKind: GpsErrorKind;
  errorMessage: string | null;
  position: { lat: number; lng: number; precisionM?: number } | null;
}

/**
 * Envía la posición GPS del patrullero al backend mientras la pestaña está activa.
 */
export function usePatrulleroGpsTracking(
  enabled: boolean,
  nombre?: string | null,
  intervalMs = DEFAULT_SEND_INTERVAL_MS,
): GpsTrackingResult {
  const [state, setState] = useState<GpsTrackingState>(enabled ? "waiting" : "idle");
  const [errorKind, setErrorKind] = useState<GpsErrorKind>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number; precisionM?: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);
  const pendingRef = useRef<{ latitud: number; longitud: number; precisionM?: number } | null>(null);
  const nombreRef = useRef(nombre);
  nombreRef.current = nombre;

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !navigator.geolocation) {
      setState("idle");
      setErrorKind(null);
      setErrorMessage(null);
      setPosition(null);
      return;
    }

    setState("waiting");
    setErrorKind(null);
    setErrorMessage(null);

    const flush = async (force = false) => {
      const pending = pendingRef.current;
      if (!pending) return;

      const now = Date.now();
      if (!force && now - lastSentRef.current < intervalMs) return;

      lastSentRef.current = now;
      try {
        await coreService.updatePosicionPatrullero({
          ...pending,
          nombre: nombreRef.current ?? undefined,
        });
        setState("active");
        setErrorKind(null);
        setErrorMessage(null);
      } catch (err) {
        lastSentRef.current = 0;
        const msg = getApiErrorMessage(err);
        setState("error");
        setErrorKind("api");
        setErrorMessage(msg);
        if (force) {
          toast.error(`No se pudo compartir GPS: ${msg}`);
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
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precisionM: pos.coords.accuracy,
        });
        void flush(true);
      },
      (geoErr) => {
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setState("denied");
          setErrorKind(null);
          setErrorMessage(null);
          toast.error("Activa la ubicación del navegador para aparecer en el mapa del operador");
        } else {
          setState("error");
          setErrorKind("geo");
          setErrorMessage("No se pudo obtener la ubicación del dispositivo");
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );

    const interval = setInterval(() => void flush(false), intervalMs);

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      clearInterval(interval);
    };
  }, [enabled, intervalMs]);

  return { state, errorKind, errorMessage, position };
}
