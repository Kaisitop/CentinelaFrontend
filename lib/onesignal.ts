"use client";

import type { OneSignalClient } from "@/components/onesignal-sdk-loader";

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? "";

export function isOneSignalConfigured() {
  return Boolean(APP_ID);
}

function runWithOneSignal<T>(fn: (os: OneSignalClient) => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        resolve(await fn(OneSignal));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForSubscriptionId(
  OneSignal: OneSignalClient,
  timeoutMs = 8000,
): Promise<string | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const id = OneSignal.User.PushSubscription.id ?? null;
    const optedIn = OneSignal.User.PushSubscription.optedIn ?? false;
    if (id && optedIn) return id;
    await sleep(250);
  }
  return OneSignal.User.PushSubscription.id ?? null;
}

/**
 * Orden Web SDK v16:
 * 1) suscribir push (permiso + optIn)
 * 2) login(externalId) para ligar esa suscripción al UUID del operador
 */
export async function bindWebPushToUser(externalId: string): Promise<{
  ok: boolean;
  permission: boolean | "default";
  optedIn: boolean;
  subscriptionId: string | null;
  externalId: string;
}> {
  if (!APP_ID || !externalId) {
    return {
      ok: false,
      permission: "default",
      optedIn: false,
      subscriptionId: null,
      externalId,
    };
  }

  return runWithOneSignal(async (OneSignal) => {
    // 1) Pedir / confirmar permiso
    try {
      await OneSignal.Slidedown.promptPush({ force: true });
    } catch {
      // prompt nativo
    }
    const granted = await OneSignal.Notifications.requestPermission();
    if (!granted) {
      return {
        ok: false,
        permission: OneSignal.Notifications.permission,
        optedIn: false,
        subscriptionId: null,
        externalId,
      };
    }

    // 2) Opt-in explícito de la suscripción web
    try {
      const sub = OneSignal.User.PushSubscription;
      if (typeof sub.optIn === "function") {
        await sub.optIn();
      }
    } catch {
      // ignore
    }

    const subscriptionId = await waitForSubscriptionId(OneSignal);

    // 3) Ligar External ID = UUID del usuario del panel
    await OneSignal.login(externalId);
    await sleep(1200);

    const optedIn = OneSignal.User.PushSubscription.optedIn ?? false;
    const finalSubId = OneSignal.User.PushSubscription.id ?? subscriptionId;

    return {
      ok: Boolean(optedIn && finalSubId),
      permission: OneSignal.Notifications.permission,
      optedIn,
      subscriptionId: finalSubId,
      externalId,
    };
  });
}

export async function loginOneSignalUser(externalId: string) {
  if (!APP_ID || !externalId) return;
  await runWithOneSignal(async (OneSignal) => {
    await OneSignal.login(externalId);
    await sleep(1000);
  });
}

export async function logoutOneSignalUser() {
  if (!APP_ID) return;
  await runWithOneSignal((OneSignal) => OneSignal.logout());
}

export async function requestPushPermission(): Promise<boolean> {
  if (!APP_ID) return false;
  return runWithOneSignal(async (OneSignal) => {
    try {
      await OneSignal.Slidedown.promptPush({ force: true });
    } catch {
      // prompt nativo
    }
    const granted = await OneSignal.Notifications.requestPermission();
    if (!granted) return false;
    try {
      const sub = OneSignal.User.PushSubscription;
      if (typeof sub.optIn === "function") {
        await sub.optIn();
      }
    } catch {
      // ignore
    }
    return true;
  });
}

export async function getPushPermission(): Promise<boolean | "default"> {
  if (!APP_ID) return "default";
  return runWithOneSignal(async (OneSignal) => OneSignal.Notifications.permission);
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!APP_ID) return false;
  return runWithOneSignal(
    async (OneSignal) => OneSignal.User.PushSubscription.optedIn ?? false,
  );
}

export async function getPushDebugInfo(): Promise<{
  permission: boolean | "default";
  optedIn: boolean;
  subscriptionId: string | null;
}> {
  if (!APP_ID) {
    return { permission: "default", optedIn: false, subscriptionId: null };
  }
  return runWithOneSignal(async (OneSignal) => ({
    permission: OneSignal.Notifications.permission,
    optedIn: OneSignal.User.PushSubscription.optedIn ?? false,
    subscriptionId: OneSignal.User.PushSubscription.id ?? null,
  }));
}

export function onNotificationClick(
  handler: (data: Record<string, unknown>) => void,
) {
  if (!APP_ID) return () => undefined;

  const listener = (event: {
    notification?: { additionalData?: Record<string, unknown> };
  }) => {
    handler(event.notification?.additionalData ?? {});
  };

  runWithOneSignal(async (OneSignal) => {
    OneSignal.Notifications.addEventListener("click", listener);
  }).catch(() => undefined);

  return () => {
    runWithOneSignal(async (OneSignal) => {
      OneSignal.Notifications.removeEventListener("click", listener);
    }).catch(() => undefined);
  };
}

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignal: OneSignalClient) => void | Promise<void>>;
  }
}
