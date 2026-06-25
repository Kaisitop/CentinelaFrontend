"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { tokenStorage } from "@/lib/api";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api").replace(
    /\/api\/?$/,
    "",
  );

export type RealtimeEvent =
  | "reporte.created"
  | "reporte.updated"
  | "alerta.created"
  | "alerta.updated"
  | "evento.created"
  | "evento.updated";

type Listener = (payload: unknown) => void;

const ALL_EVENTS: RealtimeEvent[] = [
  "reporte.created",
  "reporte.updated",
  "alerta.created",
  "alerta.updated",
  "evento.created",
  "evento.updated",
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
  if (socket?.connected) return;

  const token = tokenStorage.getAccessToken();
  if (!token) return;

  if (socket) socket.disconnect();

    socket = io(`${WS_URL}/realtime`, {
    auth: { token },
    transports: ["polling", "websocket"],
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
  return WS_URL;
}
