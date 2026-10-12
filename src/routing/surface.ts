/**
 * One app, two domains (docs/10-DEPLOY.md).
 *
 *   super1.world  → the staff surface: desk at /, Andy at /owner, Pete at /admin
 *   super1.app    → the member surface: member app at /, counter QR at /join, coaches at /coach
 *
 * Inside the router every route lives under a prefix: /w/* for super1.world, /a/* for super1.app.
 * The router's URL rewrite adds the prefix from the host on the way in and strips it on the way out,
 * so people only ever see clean URLs. A host can only reach its own prefix: super1.app/w/admin is a 404.
 *
 * Development: world.localhost:3000 and app.localhost:3000.
 * Previews (any other host): the prefixed paths are used as-is (preview.workers.dev/w/admin), and
 * `?surface=world|app` redirects to them.
 *
 * Pure functions, no DOM and no Worker APIs: used by the server middleware, the router and tests.
 */

export type Surface = "world" | "app";

export const SURFACE_PREFIX: Record<Surface, string> = { world: "/w", app: "/a" };

/** Paths that belong to one surface only. "/" belongs to whichever host you're on. */
const OWN_PATHS: Record<Surface, string[]> = {
  world: ["/owner", "/admin", "/desk"],
  app: ["/join", "/coach"],
};

const PRODUCTION: Record<Surface, string> = { world: "super1.world", app: "super1.app" };

function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

/** Which surface a host serves, or null for preview and unknown hosts. */
export function surfaceForHost(hostname: string): Surface | null {
  const h = bareHost(hostname);
  if (h === PRODUCTION.world || h.startsWith("world.")) return "world";
  if (h === PRODUCTION.app || h.startsWith("app.")) return "app";
  return null;
}

export function isProductionHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.endsWith(PRODUCTION.world) || h.endsWith(PRODUCTION.app);
}

function startsWithSegment(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(base + "/");
}

/** The surface a public path can only live on, or null when it could be either ("/"). */
export function surfaceForPath(pathname: string): Surface | null {
  for (const s of ["world", "app"] as const) {
    if (OWN_PATHS[s].some((p) => startsWithSegment(pathname, p))) return s;
  }
  return null;
}

export function otherSurface(s: Surface): Surface {
  return s === "world" ? "app" : "world";
}

/**
 * The host of the other surface, keeping the port and the environment:
 * super1.world ↔ super1.app, world.localhost ↔ app.localhost, world.staging.x ↔ app.staging.x.
 */
export function swapHost(host: string, to: Surface): string {
  const [hostname, port] = host.split(":");
  const h = bareHost(hostname);
  let out = h;
  if (h === PRODUCTION.world || h === PRODUCTION.app) out = PRODUCTION[to];
  else if (h.startsWith("world.") || h.startsWith("app.")) out = `${to}.${h.replace(/^(world|app)\./, "")}`;
  return port ? `${out}:${port}` : out;
}

export type Origins = Partial<Record<Surface, string>>;

/** Absolute origin for a surface, from the configured origins or by swapping the current host. */
export function originFor(current: URL, to: Surface, origins: Origins = {}): string {
  const configured = origins[to];
  if (configured && isProductionHost(current.hostname)) return configured.replace(/\/$/, "");
  return `${current.protocol}//${swapHost(current.host, to)}`;
}

/**
 * Where a request should go instead, or null to serve it.
 * - www.<domain> → the bare domain
 * - a path that belongs to the other surface → that surface's domain (super1.world/join → super1.app/join)
 * - a preview host with ?surface=world|app → the prefixed path
 */
export function hostRedirect(url: URL, origins: Origins = {}): string | null {
  if (url.hostname.toLowerCase().startsWith("www.")) {
    const u = new URL(url);
    u.hostname = bareHost(url.hostname);
    return u.toString();
  }
  const host = surfaceForHost(url.hostname);
  if (host) {
    const want = surfaceForPath(url.pathname);
    if (want && want !== host) return `${originFor(url, want, origins)}${url.pathname}${url.search}`;
    return null;
  }
  const asked = url.searchParams.get("surface");
  if ((asked === "world" || asked === "app") && !isProductionHost(url.hostname)) {
    const prefix = SURFACE_PREFIX[asked];
    const u = new URL(url);
    const rest = [...u.searchParams].filter(([k]) => k !== "surface");
    u.search = rest.length ? "?" + new URLSearchParams(rest).toString() : "";
    if (!startsWithSegment(u.pathname, prefix)) u.pathname = prefix + (u.pathname === "/" ? "" : u.pathname) || prefix;
    return u.toString();
  }
  return null;
}

/** Browser URL → router URL: add the host's prefix. Preview hosts pass through. */
export function toInternal(url: URL): URL {
  const s = surfaceForHost(url.hostname);
  if (!s) return url;
  url.pathname = SURFACE_PREFIX[s] + (url.pathname === "/" ? "" : url.pathname);
  return url;
}

/** Router URL → browser URL: strip the prefix; a link into the other surface goes to its domain. */
export function toPublic(url: URL, origins: Origins = {}): URL {
  const s = surfaceForHost(url.hostname);
  if (!s) return url;
  for (const target of ["world", "app"] as const) {
    const prefix = SURFACE_PREFIX[target];
    if (startsWithSegment(url.pathname, prefix)) {
      url.pathname = url.pathname.slice(prefix.length) || "/";
      if (target !== s) {
        const o = new URL(originFor(url, target, origins));
        url.protocol = o.protocol;
        url.host = o.host;
      }
      return url;
    }
  }
  return url;
}

/** The surface a router path belongs to (from its prefix). */
export function surfaceOfInternalPath(pathname: string): Surface | null {
  if (startsWithSegment(pathname, SURFACE_PREFIX.world)) return "world";
  if (startsWithSegment(pathname, SURFACE_PREFIX.app)) return "app";
  return null;
}
