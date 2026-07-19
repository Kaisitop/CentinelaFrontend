"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { tokenStorage } from "@/lib/api";

const WS_ENABLED = process.env.NEXT_PUBLIC_WS_ENABLED === "true";

/** Misma origen (proxy Vercel) o URL absoluta del gateway. */
function resolveWsUrl(): string {
  const api = process.env.NEXT_PUBLIC_API_URL || "/gateway";

  // Con proxy /gateway siempre same-origin (ignora WS_URL http → Mixed Content).
  if (api.startsWith("/")) {
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }

  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.replace(/\/$/, "");
  }

  return api.replace(/\/api\/?$/, "").replace(/\/gateway\/?$/, "");
}

export type RealtimeEvent =
  | "reporte.created"
  | "reporte.updated"
  | "alerta.created"
  | "alerta.updated"
  | "evento.created"
  | "evento.updated"
  | "patrullero.position";

type Listener = (payload: unknown) => void;

const ALL_EVENTS: RealtimeEvent[] = [
  "reporte.created",
  "reporte.updated",
  "alerta.created",
  "alerta.updated",
  "evento.created",
  "evento.updated",
  "patrullero.position",
];

const listeners = new Map<RealtimeEvent, Set<Listener>>();
let socket: Socket | null = null;

function addListener(event: RealtimeEvent, fn: Listener) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(fn);
}

function removeListener(event: RealtimeEvent, fn: Listener) {
  listeners.get(event)?.delete(fn);
}

function dispatch(event: RealtimeEvent, payload: unknown) {
  listeners.get(event)?.forEach((fn) => fn(payload));
}

function connectSocket() {
  if (!WS_ENABLED) return;
  if (socket?.connected) return;

  const token = tokenStorage.getAccessToken();
  if (!token) return;

  if (socket) socket.disconnect();

  const WS_URL = resolveWsUrl();
  if (!WS_URL) return;

  // En proxy Vercel el upgrade WebSocket falla; polling HTTP sí pasa por rewrite.
  const sameOriginProxy =
    typeof window !== "undefined" && WS_URL === window.location.origin;

  socket = io(`${WS_URL}/realtime`, {
    auth: { token },
    transports: sameOriginProxy ? ["polling"] : ["polling", "websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
  });

  for (const event of ALL_EVENTS) {
    socket.on(event, (payload: unknown) => dispatch(event, payload));
  }
}

function disconnectSocket() {
  const hasListeners = [...listeners.values()].some((set) => set.size > 0);
  if (!hasListeners && socket) {
    socket.disconnect();
    socket = null;
  }
}

type RealtimeHandlers = Partial<Record<RealtimeEvent, (payload: unknown) => void>>;

/** Suscripción al canal WebSocket del gateway (una conexión compartida). */
export function useCentinelaRealtime(handlers: RealtimeHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const wrapped: Partial<Record<RealtimeEvent, Listener>> = {};

    for (const event of ALL_EVENTS) {
      if (handlersRef.current[event]) {
        wrapped[event] = (payload: unknown) => handlersRef.current[event]?.(payload);
      }
    }

    for (const [event, fn] of Object.entries(wrapped) as [RealtimeEvent, Listener][]) {
      addListener(event, fn);
    }

    connectSocket();

    return () => {
      for (const [event, fn] of Object.entries(wrapped) as [RealtimeEvent, Listener][]) {
        removeListener(event, fn);
      }
      disconnectSocket();
    };
  }, []);
}

export function getWsBaseUrl() {
  return resolveWsUrl();
}
