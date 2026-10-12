/**
 * Scans made while the desk is offline (docs/02-CONNECTIONS.md, flow 4). The desk never decides
 * offline: it shows "Can't check" and keeps the code on this device, then replays the scans in order
 * when the connection is back. Nothing is allowed in by this queue.
 */
const KEY = "s1_scan_queue";

type Queued = { code: string; at: number; device: string | null };

function read(): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Queued[];
  } catch {
    return [];
  }
}

function write(items: Queued[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full or private mode: the scan was still shown as "Can't check" */
  }
}

export function queueScan(code: string, device: string | null) {
  write([...read(), { code, at: Date.now(), device }]);
}

export function queuedCount(): number {
  return read().length;
}

/** Replay oldest first; stop at the first network failure so the order is kept. */
export async function replayScans(send: (code: string, device: string | null) => Promise<unknown>): Promise<number> {
  const items = read().sort((a, b) => a.at - b.at);
  let done = 0;
  for (const q of items) {
    try {
      await send(q.code, q.device);
    } catch (e) {
      if (isNetworkError(e)) break;
    }
    done++;
    write(items.slice(done));
  }
  return done;
}

export function isNetworkError(e: unknown): boolean {
  const msg = typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  return (typeof navigator !== "undefined" && !navigator.onLine) || /Failed to fetch|NetworkError|Load failed|network/i.test(msg);
}
