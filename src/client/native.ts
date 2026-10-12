/**
 * The iOS / Android shells (Capacitor) load super1.app; this is the little bridge the web app uses when it
 * runs inside one. Everything is a dynamic import, so the web bundle doesn't carry it and a browser skips it.
 */
import { supabaseBrowser } from "./supabase";

type Cap = { isNativePlatform: () => boolean; getPlatform: () => string };
function cap(): Cap | null {
  const c = typeof window === "undefined" ? undefined : (window as unknown as { Capacitor?: Cap }).Capacitor;
  return c?.isNativePlatform() ? c : null;
}

export const isNativeApp = () => !!cap();

/** Ask for notifications, register the FCM token for this login, and open the right screen when one is tapped. */
export async function setupNativeApp(go: (path: string) => void): Promise<void> {
  const c = cap();
  if (!c) return;
  const [{ FirebaseMessaging }, { App }] = await Promise.all([import("@capacitor-firebase/messaging"), import("@capacitor/app")]);
  // Deep links: a super1.app link (invite, reminder) opens here; route to its path.
  await App.addListener("appUrlOpen", ({ url }) => {
    try {
      const u = new URL(url);
      if (u.hostname.endsWith("super1.app")) go(u.pathname + u.search);
    } catch {
      /* not a link we handle */
    }
  });
  // A tapped notification opens its screen (the worker puts the path in data.link).
  await FirebaseMessaging.addListener("notificationActionPerformed", ({ notification }) => {
    const link = (notification.data as { link?: string } | undefined)?.link;
    if (link) go(link);
  });
  let perm = await FirebaseMessaging.checkPermissions();
  if (perm.receive === "prompt") perm = await FirebaseMessaging.requestPermissions();
  if (perm.receive !== "granted") return;
  // FCM token on both iOS and Android (what the worker sends to), registered for this login.
  const { token } = await FirebaseMessaging.getToken();
  await (supabaseBrowser().rpc as unknown as (f: string, a: object) => Promise<unknown>)("register_push", { p_token: token, p_platform: c.getPlatform() === "ios" ? "ios" : "android" });
  await FirebaseMessaging.addListener("tokenReceived", ({ token: t }) => {
    void (supabaseBrowser().rpc as unknown as (f: string, a: object) => Promise<unknown>)("register_push", { p_token: t, p_platform: c.getPlatform() === "ios" ? "ios" : "android" });
  });
}

/** Full brightness while the member QR is on screen (easier to scan), back to how it was after. */
export async function brightForQr(): Promise<() => void> {
  if (!cap()) return () => undefined;
  const { ScreenBrightness } = await import("@capacitor-community/screen-brightness");
  const { brightness } = await ScreenBrightness.getBrightness();
  await ScreenBrightness.setBrightness({ brightness: 1 });
  return () => void ScreenBrightness.setBrightness({ brightness });
}
