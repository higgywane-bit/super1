import { useImperativeHandle, useRef, useState, type Ref } from "react";

export type SignaturePadHandle = { clear: () => void; toPng: () => string | null; isEmpty: () => boolean };

const W = 342;
const H = 150;

/** Draw-with-a-finger signature (Join · Waiver). Exports a transparent PNG with white strokes. */
export function SignaturePad({ label, onChange, ref }: { label: string; onChange: (hasInk: boolean) => void; ref?: Ref<SignaturePadHandle> }) {
  const [strokes, setStrokes] = useState<[number, number][][]>([]);
  const drawing = useRef(false);
  const box = useRef<HTMLDivElement>(null);

  const point = (e: React.PointerEvent): [number, number] => {
    const r = box.current!.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * W), Math.round(((e.clientY - r.top) / r.height) * H)];
  };

  useImperativeHandle(ref, () => ({
    clear: () => {
      setStrokes([]);
      onChange(false);
    },
    isEmpty: () => strokes.length === 0,
    toPng: () => {
      if (!strokes.length) return null;
      const scale = 2;
      const c = document.createElement("canvas");
      c.width = W * scale;
      c.height = H * scale;
      const g = c.getContext("2d");
      if (!g) return null;
      g.scale(scale, scale);
      g.strokeStyle = "#ffffff";
      g.lineWidth = 2.6;
      g.lineCap = "round";
      g.lineJoin = "round";
      for (const s of strokes) {
        g.beginPath();
        s.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        if (s.length === 1) g.lineTo(s[0][0] + 0.1, s[0][1]);
        g.stroke();
      }
      return c.toDataURL("image/png");
    },
  }));

  return (
    <div
      ref={box}
      role="img"
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drawing.current = true;
        setStrokes((s) => [...s, [point(e)]]);
        onChange(true);
      }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        const p = point(e);
        setStrokes((s) => {
          const next = s.slice();
          next[next.length - 1] = [...next[next.length - 1], p];
          return next;
        });
      }}
      onPointerUp={() => (drawing.current = false)}
      onPointerCancel={() => (drawing.current = false)}
      style={{ height: 150, borderRadius: 16, background: "var(--surface-2)", boxShadow: "inset 0 0 0 1px var(--hairline)", touchAction: "none", cursor: "crosshair", position: "relative" }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
        <line x1="20" y1="118" x2="322" y2="118" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4 6" />
        {strokes.map((s, i) => (
          <path key={i} d={s.map(([x, y], j) => `${j ? "L" : "M"}${x} ${y}`).join(" ") + (s.length === 1 ? ` L${s[0][0] + 0.1} ${s[0][1]}` : "")} fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    </div>
  );
}
