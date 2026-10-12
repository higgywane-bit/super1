import { Coffee, type LucideIcon } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { storageUrl } from "../../client/supabase";
import { Icon } from "../../components/kit";

/** A storage photo in a fixed box; when there's no photo or it can't load, a quiet icon tile instead. */
export function Photo({ path, size, radius = "var(--radius-sm)", icon = Coffee, style }: { path: string | null | undefined; size: number | string; radius?: string; icon?: LucideIcon; style?: CSSProperties }) {
  const [broken, setBroken] = useState(false);
  const url = storageUrl(path);
  const box: CSSProperties = { width: size, height: size, flex: "none", borderRadius: radius, overflow: "hidden", background: "var(--surface-3)", display: "grid", placeItems: "center", color: "var(--text-tertiary)", ...style };
  return (
    <span style={box}>
      {url && !broken ? <img src={url} alt="" onError={() => setBroken(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon icon={icon} size={20} />}
    </span>
  );
}
