/**
 * Stand-in for the Firebase web SDK's `firebase/messaging`, which @capacitor-firebase/messaging's web
 * fallback imports. SUPER1 only pushes inside the iOS / Android shells (src/client/native.ts returns early in
 * a browser), so the web SDK is never needed; vite.config.ts aliases the import here to keep it out.
 */
const unsupported = () => {
  throw new Error("Push in the browser isn't used by SUPER1.");
};
export const isSupported = async () => false;
export const getMessaging = unsupported;
export const getToken = unsupported;
export const deleteToken = unsupported;
export const onMessage = unsupported;
