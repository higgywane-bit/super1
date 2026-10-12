import { useState } from "react";
import { storageUrl } from "../../client/supabase";

/** An exercise's short loop (mp4/webm, muted, inline) or still, from the `exercises` bucket. Nothing if absent or broken. */
export function ExerciseMedia({ path, height = 200, radius = "var(--radius-card)" }: { path: string | null | undefined; height?: number | string; radius?: string }) {
  const [broken, setBroken] = useState(false);
  const url = storageUrl(path);
  if (!url || broken) return null;
  const style = { width: "100%", height, objectFit: "cover" as const, borderRadius: radius, background: "var(--surface-2)", display: "block" };
  return /\.(mp4|webm|mov)$/i.test(url) ? (
    <video src={url} autoPlay loop muted playsInline aria-hidden onError={() => setBroken(true)} style={style} />
  ) : (
    <img src={url} alt="" onError={() => setBroken(true)} style={style} />
  );
}
