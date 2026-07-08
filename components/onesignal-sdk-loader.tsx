"use client";

import Script from "next/script";

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? "";

/**
 * OneSignal Web SDK v16 — https://documentation.onesignal.com/docs/en/onesignal-service-worker
 * Workers usan importScripts same-origin (Firefox bloquea el CDN dentro del SW).
 */
export function OneSignalSdkLoader() {
  if (!APP_ID) return null;

  return (
    <>
      <Script id="onesignal-deferred-init" strategy="beforeInteractive">
        {`
          window.OneSignalDeferred = window.OneSignalDeferred || [];
          OneSignalDeferred.push(async function(OneSignal) {
            await OneSignal.init({
              appId: "${APP_ID}",
              allowLocalhostAsSecureOrigin: true,
              notifyButton: { enable: false },
              serviceWorkerPath: "push/onesignal/OneSignalSDKWorker.js",
              serviceWorkerParam: { scope: "/push/onesignal/" }
            });
          });
        `}
      </Script>
      <Script
        src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
        strategy="afterInteractive"
      />
    </>
  );
}

export type OneSignalClient = {
  init(options: Record<string, unknown>): Promise<void>;
  login(externalId: string): Promise<void>;
  logout(): Promise<void>;
  Notifications: {
    permission: boolean;
    requestPermission(): Promise<boolean>;
    addEventListener(
      event: "click",
      listener: (event: {
        notification?: { additionalData?: Record<string, unknown> };
      }) => void,
    ): void;
    removeEventListener(
      event: "click",
      listener: (event: {
        notification?: { additionalData?: Record<string, unknown> };
      }) => void,
    ): void;
  };
  User: {
    PushSubscription: {
      id?: string | null;
      optedIn?: boolean;
      optIn?: () => Promise<void>;
    };
  };
  Slidedown: {
    promptPush(options?: { force?: boolean }): Promise<void>;
  };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignal: OneSignalClient) => void | Promise<void>>;
  }
}
