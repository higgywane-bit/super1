import wordmark from "../../../design/brand/super1-wordmark.png";
import one from "../../../design/brand/super1-one.png";

/**
 * The SUPER1 wordmark. With `motion`, it plays Motion #1 (app launch): the wordmark wipes in
 * left→right 700 ms after 120 ms, and a blue glow blooms behind the 1 for 900 ms after 650 ms.
 * Callers decide when to animate (once per launch, never on resume): see useLaunchMotion.
 */
export function Wordmark({ height = 44, motion = false, glow = true }: { height?: number; motion?: boolean; glow?: boolean }) {
  const g = Math.round(height * 3.4);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {glow && (
        <span
          className={motion ? "s1-bloom" : undefined}
          aria-hidden="true"
          style={{ position: "absolute", right: -height, top: -height * 1.05, width: g, height: g, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,160,255,0.7) 0%, rgba(0,69,251,0) 70%)", opacity: motion ? undefined : 0.5, pointerEvents: "none" }}
        />
      )}
      <img className={motion ? "s1-wipe" : undefined} src={wordmark} alt="SUPER1" style={{ position: "relative", height, width: "auto", display: "block" }} />
    </div>
  );
}

/** The gradient 1 alone (counter mode, the welcome moment). */
export function TheOne({ height = 120, className }: { height?: number; className?: string }) {
  return <img src={one} alt="" aria-hidden="true" className={className} style={{ height, width: "auto", display: "block" }} />;
}
