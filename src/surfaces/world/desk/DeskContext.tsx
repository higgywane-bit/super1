import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { desk, type Signup } from "../../../client/desk";
import { signOut } from "../../shared/useCodeSignIn";
import { isMuted, setMuted as storeMuted, unlockAudio } from "../../../client/sound";

/** Who is on shift on this device. Every desk change is recorded under this staff member. */
export type Shift = { staffId: string; name: string; shiftId: string | null; deviceId: string | null };

export type SheetState =
  | { type: "sell"; memberId: string; planId?: string }
  | { type: "signup"; signup: Signup }
  | { type: "link"; signup: Signup }
  | { type: "pt" }
  | { type: "archive"; memberId: string }
  | { type: "pause"; memberId: string }
  | { type: "endPause"; memberId: string; pauseId: string; from: string; until: string }
  | { type: "message" }
  | { type: "daypass" }
  | { type: "addTag"; memberId: string }
  | { type: "newMember" };

const SHIFT_KEY = "s1_shift";
const DEVICE_KEY = "s1_device";

function readShift(): Shift | null {
  try {
    const raw = localStorage.getItem(SHIFT_KEY);
    return raw ? (JSON.parse(raw) as Shift) : null;
  } catch {
    return null;
  }
}

type DeskApi = {
  shift: Shift | null;
  startShift: (staffId: string, name: string) => Promise<void>;
  changeShift: () => void;
  sheet: SheetState | null;
  open: (s: SheetState) => void;
  close: () => void;
  muted: boolean;
  setMuted: (m: boolean) => void;
  /** Refetch everything the desk shows (after a change). */
  refresh: () => void;
};

const Ctx = createContext<DeskApi | null>(null);

export function DeskProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [shift, setShift] = useState<Shift | null>(null);
  const [ready, setReady] = useState(false);
  const [picking, setPicking] = useState(false);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    setShift(readShift());
    setMutedState(isMuted());
    setReady(true);
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const startShift = useCallback(async (staffId: string, name: string) => {
    let deviceId: string | null = null;
    try {
      deviceId = localStorage.getItem(DEVICE_KEY);
    } catch {
      /* no storage */
    }
    if (!deviceId) {
      deviceId = await desk.registerDevice(navigator.userAgent.includes("iPad") ? "Desk iPad" : "Desk computer");
      try {
        localStorage.setItem(DEVICE_KEY, deviceId);
      } catch {
        /* no storage */
      }
    }
    const shiftId = await desk.startShift(deviceId, staffId);
    const s: Shift = { staffId, name, shiftId, deviceId };
    try {
      localStorage.setItem(SHIFT_KEY, JSON.stringify(s));
    } catch {
      /* no storage */
    }
    setShift(s);
    setPicking(false);
  }, []);

  // Pete can sign a desk device out (A05, or a new desk passcode): the device checks every minute and signs itself out.
  useEffect(() => {
    const device = shift?.deviceId;
    if (!device) return;
    let stop = false;
    const check = async () => {
      const ok = await desk.deviceOk(device).catch(() => true);
      if (ok || stop) return;
      try {
        localStorage.removeItem(SHIFT_KEY);
        localStorage.removeItem(DEVICE_KEY);
      } catch {
        /* no storage */
      }
      await signOut(router);
    };
    void check();
    const id = window.setInterval(() => void check(), 60_000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [shift?.deviceId, router]);

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["desk"] });
  }, [qc]);

  const api = useMemo<DeskApi>(
    () => ({
      shift: picking ? null : shift,
      startShift,
      changeShift: () => setPicking(true),
      sheet,
      open: setSheet,
      close: () => setSheet(null),
      muted,
      setMuted: (m) => {
        storeMuted(m);
        setMutedState(m);
      },
      refresh,
    }),
    [shift, picking, startShift, sheet, muted, refresh],
  );

  if (!ready) return null;
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDesk(): DeskApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDesk outside DeskProvider");
  return v;
}

/** The staff member on shift; screens only render once there is one. */
export function useStaffId(): string {
  const { shift } = useDesk();
  if (!shift) throw new Error("No shift");
  return shift.staffId;
}

export function useStaticData() {
  const plans = useQuery({ queryKey: ["desk", "plans"], queryFn: desk.plans, staleTime: 60_000 });
  const coaches = useQuery({ queryKey: ["desk", "coaches"], queryFn: desk.coaches, staleTime: 300_000 });
  return { plans: plans.data ?? [], coaches: coaches.data ?? [] };
}
