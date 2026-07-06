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

export async function loginOneSignalUser(externalId: string) {
  if (!APP_ID) return;
  await runWithOneSignal((OneSignal) => OneSignal.login(externalId));
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
      // usar prompt nativo
    }
    return OneSignal.Notifications.requestPermission();
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
