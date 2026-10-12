import { getBoot, getViewer, type Boot, type Viewer } from "../server/session";

/**
 * Browser-side caches for the boot config and the signed-in login. On the server every request
 * fetches fresh (module state is shared between requests there, so nothing is cached).
 */
let bootP: Promise<Boot> | null = null;
let viewerP: Promise<Viewer | null> | null = null;
const isBrowser = typeof window !== "undefined";

export function loadBoot(): Promise<Boot> {
  if (!isBrowser) return getBoot();
  return (bootP ??= getBoot().catch((e) => {
    bootP = null;
    throw e;
  }));
}

export function loadViewer(): Promise<Viewer | null> {
  if (!isBrowser) return getViewer();
  return (viewerP ??= getViewer().catch((e) => {
    viewerP = null;
    throw e;
  }));
}

/** After sign-in, sign-out or a language change: refetch on the next route load. */
export function forgetSession() {
  bootP = null;
  viewerP = null;
}
