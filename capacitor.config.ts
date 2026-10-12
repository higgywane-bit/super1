import type { CapacitorConfig } from "@capacitor/cli";

/**
 * iOS and Android shells around super1.app (docs/10-DEPLOY.md). The shell loads the live member app, so
 * every deploy reaches the stores' installs at once; native adds push notifications, screen brightness for
 * the member QR, and deep links from invite emails (super1.app links open the app).
 */
const config: CapacitorConfig = {
  appId: "app.super1.member",
  appName: "SUPER1",
  webDir: "native/www",
  backgroundColor: "#000000",
  server: {
    url: process.env.CAP_SERVER_URL ?? "https://super1.app",
    allowNavigation: ["super1.app", "*.super1.app"],
  },
  ios: { contentInset: "never", limitsNavigationsToAppBoundDomains: true },
  android: { allowMixedContent: false },
  plugins: {
    FirebaseMessaging: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
