import qrcode from "qrcode-generator";
import { useMemo } from "react";
import { surfaceForHost, swapHost } from "../../routing/surface";

/** A QR code as plain SVG squares (dark on white, as scanners expect). */
export function QrCode({ value, size = 200, label }: { value: string; size?: number; label: string }) {
  const { n, cells } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    const cells: string[] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) cells.push(`M${c} ${r}h1v1h-1z`);
    return { n, cells };
  }, [value]);
  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox={`-2 -2 ${n + 4} ${n + 4}`} shapeRendering="crispEdges" style={{ display: "block" }}>
      <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="white" />
      <path d={cells.join("")} fill="black" />
    </svg>
  );
}

/** The counter QR's address on this deployment: super1.app/join (app.localhost:3000/join in dev, /a/join on previews). */
export function joinUrl(): string {
  if (typeof window === "undefined") return "https://super1.app/join";
  const { host, hostname, protocol, origin } = window.location;
  if (surfaceForHost(hostname)) return `${protocol}//${swapHost(host, "app")}/join`;
  return `${origin}/a/join`;
}
