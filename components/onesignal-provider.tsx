"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  bindWebPushToUser,
  getPushPermission,
  isOneSignalConfigured,
  isPushSubscribed,
  logoutOneSignalUser,
  onNotificationClick,
} from "@/lib/onesignal";
import { useAuth } from "@/components/auth-provider";
import { isPolicia } from "@/lib/roles";

type PushState = "unsupported" | "loading" | "default" | "granted" | "denied";

interface OneSignalContextValue {
  configured: boolean;
  pushState: PushState;
  subscribed: boolean;
  enablePush: () => Promise<boolean>;
}

const OneSignalContext = createContext<OneSignalContextValue | undefined>(undefined);

export function OneSignalProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const configured = isOneSignalConfigured();
  const [pushState, setPushState] = useState<PushState>(
    configured ? "loading" : "unsupported",
  );
  const [subscribed, setSubscribed] = useState(false);

  const refreshPushState = useCallback(async () => {
    if (!configured) {
      setPushState("unsupported");
      setSubscribed(false);
      return;
    }

    const permission = await getPushPermission();
    if (permission === true) setPushState("granted");
    else if (permission === false) setPushState("denied");
    else setPushState("default");

    setSubscribed(await isPushSubscribed());
  }, [configured]);

  useEffect(() => {
    if (!configured || !isAuthenticated || !user?.id) return;

    let cancelled = false;

    (async () => {
      const result = await bindWebPushToUser(user.id);
      if (cancelled) return;

      await refreshPushState();
      console.info("[OneSignal] bindWebPushToUser", result);

      if (!result.ok) {
        console.warn(
          "[OneSignal] Suscripción no ligada al usuario. " +
            "Sin subscriptionId/optedIn OneSignal devolverá invalid_aliases.",
          result,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, isAuthenticated, user?.id, refreshPushState]);

  useEffect(() => {
    if (!configured) return;

    const removeClick = onNotificationClick((data) => {
      const alertaId = typeof data.alertaId === "string" ? data.alertaId : null;
      const url = typeof data.url === "string" ? data.url : null;

      if (isPolicia(user)) {
        if (alertaId) {
          router.push(`/patrullaje?alerta=${alertaId}`);
        } else {
          router.push("/patrullaje");
        }
        return;
      }

      if (url && url.startsWith(window.location.origin)) {
        router.push(url.replace(window.location.origin, ""));
        return;
      }

      if (alertaId) {
        router.push(`/alertas?alerta=${alertaId}`);
      }
    });

    return removeClick;
  }, [configured, router, user]);

  const enablePush = useCallback(async () => {
    if (!configured || !user?.id) return false;
    const result = await bindWebPushToUser(user.id);
    await refreshPushState();
    console.info("[OneSignal] enablePush", result);
    return result.ok;
  }, [configured, user?.id, refreshPushState]);

  useEffect(() => {
    if (!isAuthenticated) {
      logoutOneSignalUser().catch(() => undefined);
      setPushState(configured ? "default" : "unsupported");
      setSubscribed(false);
    }
  }, [isAuthenticated, configured]);

  return (
    <OneSignalContext.Provider
      value={{ configured, pushState, subscribed, enablePush }}
    >
      {children}
    </OneSignalContext.Provider>
  );
}

export function useOneSignalPush() {
  const ctx = useContext(OneSignalContext);
  if (!ctx) {
    throw new Error("useOneSignalPush debe usarse dentro de OneSignalProvider");
  }
  return ctx;
}
