/**
 * Desk sounds (docs/05-DESIGN.md): allowed = short bell, declined = low buzz, new sign-up = soft chime.
 * Web Audio, synthesised (no files). Browsers only allow audio after a tap, so the first tap on the
 * page unlocks it. Muting is per device.
 */
const MUTE_KEY = "s1_muted";
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  return ctx;
}

export function unlockAudio() {
  const c = audio();
  if (c && c.state === "suspended") void c.resume();
}

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(m: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    /* private mode: stays on for this page */
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export function playSound(kind: "allowed" | "declined" | "chime") {
  if (isMuted()) return;
  if (kind === "allowed") {
    tone(1318.5, 0, 0.9, "sine", 0.25);
    tone(2637, 0, 0.5, "sine", 0.06);
  } else if (kind === "declined") {
    tone(110, 0, 0.42, "sawtooth", 0.12);
    tone(116, 0.02, 0.4, "square", 0.05);
  } else {
    tone(880, 0, 0.5, "sine", 0.12);
    tone(1174.7, 0.14, 0.6, "sine", 0.1);
  }
}
