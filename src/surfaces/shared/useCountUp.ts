import { useEffect, useRef, useState } from "react";
import { localDate } from "../../lib/dates";

const KEY = "s1_countup_day";

/** Has today's count-up already played on this device? (Motion #5: first view of the day only.) */
function playedToday(): boolean {
  try {
    return localStorage.getItem(KEY) === localDate();
  } catch {
    return false;
  }
}

/**
 * Motion #5: headline numbers count from 0 in ~950 ms, ease-out cubic, on the first view of the day.
 * Reduced motion, or already seen today: the number just appears.
 */
export function useCountUp(target: number, ms = 950): number {
  const [value, setValue] = useState(target);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) {
      setValue(target);
      return;
    }
    started.current = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || playedToday() || !target) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
      else {
        try {
          localStorage.setItem(KEY, localDate());
        } catch {
          /* no storage */
        }
      }
    };
    setValue(0);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}
