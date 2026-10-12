import { useQueryClient } from "@tanstack/react-query";
import { Check, FileText, TriangleAlert, Upload } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { admin } from "../../../client/admin";
import { toUiError } from "../../../client/errors";
import { Button, Card, Disc, Icon, useToast } from "../../../components/kit";
import { useI18n, type MessageKey } from "../../../i18n";
import { baht, dayLabel } from "../../../i18n/format";
import { importQashier, previewQashier, type QashierImportResult, type QashierPreview } from "../../../server/qashier";
import { ErrorText } from "../../shared/ErrorText";
import { PageHeader } from "../StaffSidebar";
import { useImportedDays } from "./useAdminData";

type Loaded = { name: string; text: string };

const bahtCents = (n: number) => `฿${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "item";

/** A01 · Qashier import: drop CSVs → preview (checks, desk vs Qashier, not in menu, legacy) → Import. */
export function AdminImport() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const days = useImportedDays();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<Loaded[]>([]);
  const [previews, setPreviews] = useState<QashierPreview[] | null>(null);
  const [results, setResults] = useState<QashierImportResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);

  async function load(list: FileList | File[]) {
    const picked = [...list].filter((f) => /\.csv$/i.test(f.name) || f.type.includes("csv") || f.type === "text/plain");
    if (!picked.length) return;
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const loaded = await Promise.all(picked.map(async (f) => ({ name: f.name, text: await f.text() })));
      setFiles(loaded);
      setPreviews(await previewQashier({ data: { files: loaded } }));
    } catch (e) {
      setError(toUiError(e).key);
    } finally {
      setBusy(false);
      // Let the same file be picked again (a re-export, or checking "Already imported").
      if (input.current) input.current.value = "";
    }
  }

  function reset() {
    setFiles([]);
    setPreviews(null);
    setResults(null);
    if (input.current) input.current.value = "";
  }

  async function doImport() {
    const todo = files.filter((f) => previews?.find((p) => p.fileName === f.name && p.ok && p.state !== "already"));
    if (!todo.length) return;
    setBusy(true);
    try {
      const r = await importQashier({ data: { files: todo } });
      setResults(r);
      if (r.every((x) => x.status !== "error")) toast(t("imp.done"), { tone: "go" });
      await qc.invalidateQueries({ queryKey: ["owner"] });
      await qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) {
      setError(toUiError(e).key);
    } finally {
      setBusy(false);
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setHover(false);
    void load(e.dataTransfer.files);
  };

  const good = (previews ?? []).filter((p) => p.ok && p.state !== "already");
  const first = previews?.find((p) => p.ok);
  const waiting = new Set(good.map((p) => p.day!.businessDate));

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader title={t("imp.title")} sub={<span style={{ display: "block", maxWidth: 680 }}>{t("imp.sub")}</span>} />
      <input ref={input} type="file" accept=".csv,text/csv" multiple hidden data-testid="qashier-file" onChange={(e) => e.target.files && void load(e.target.files)} />

      {!previews && (
        <Card
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setHover(true);
          }}
          onDragLeave={() => setHover(false)}
          onDrop={onDrop}
          style={{
            padding: "40px 22px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            cursor: "pointer",
            boxShadow: `inset 0 0 0 2px ${hover ? "var(--s1-blue)" : "var(--surface-3)"}`,
            borderStyle: "dashed",
          }}
        >
          <Disc tone="money">
            <Icon icon={Upload} />
          </Disc>
          <span className="s1-headline" style={{ textAlign: "center" }}>
            {t("imp.drop")}
          </span>
          <Button size="sm" variant="tinted" disabled={busy} onClick={(e) => (e.stopPropagation(), input.current?.click())}>
            {t("imp.choose")}
          </Button>
        </Card>
      )}
      <ErrorText k={error} />

      {previews && (
        <Card style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Disc tone="money">
            <Icon icon={FileText} />
          </Disc>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0, flex: 1 }}>
            <span className="s1-headline">
              {first?.day ? `${`${dayLabel(first.day.businessDate, lang)} ${first.day.businessDate.slice(0, 4)}`} · ${first.day.store}` : previews[0]?.fileName}
              {previews.length > 1 ? ` +${previews.length - 1}` : ""}
            </span>
            <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>
              {first?.day ? t("imp.meta", { file: first.fileName, sections: 12, products: first.day.productCount }) : ""}
            </span>
          </div>
          {results ? (
            <span className="s1-pill" style={{ color: "var(--s1-green)", background: "var(--s1-green-tint)" }} data-testid="import-done">
              <Icon icon={Check} size={14} /> {t("imp.done")}
            </span>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Button variant="plain" style={{ color: "var(--foreground)" }} onClick={reset} disabled={busy}>
                {t("imp.cancel")}
              </Button>
              {good.length ? (
                <Button onClick={() => void doImport()} disabled={busy}>
                  {good.length === 1 ? t("imp.import", { day: dayLabel(good[0].day!.businessDate, lang) }) : t("imp.importN", { n: good.length })}
                </Button>
              ) : (
                <span className="s1-pill">{t("imp.already")}</span>
              )}
            </div>
          )}
          {results && (
            <Button size="sm" variant="tinted" onClick={reset}>
              {t("imp.choose")}
            </Button>
          )}
        </Card>
      )}

      {previews?.map((p) => (p.ok ? <PreviewBody key={p.fileName} p={p} onDrafts={() => void qc.invalidateQueries({ queryKey: ["admin", "menu"] })} /> : <ErrorLine key={p.fileName} text={t("imp.failed", { file: p.fileName, error: p.error ?? "" })} />))}

      <Card style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ font: "600 14px/18px var(--font-sans)", color: "var(--text-secondary)", marginRight: 4 }}>{t("imp.days")}</span>
        {[...waiting].filter((d) => !results).map((d) => (
          <span key={d} className="s1-pill" style={{ color: "var(--s1-yellow)", background: "var(--s1-yellow-tint)" }}>
            {t("imp.waiting", { day: dayLabel(d, lang) })}
          </span>
        ))}
        {(days.data ?? []).slice(0, 7).map((d) => (
          <span key={d.business_date} className="s1-pill" data-testid="imported-day">
            {dayLabel(d.business_date, lang)}
            {d.version > 1 ? ` · v${d.version}` : ""}
          </span>
        ))}
        <span style={{ marginLeft: "auto", font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)", maxWidth: 300, textAlign: "right" }}>{t("imp.daysNote")}</span>
      </Card>
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <Card style={{ padding: 16, display: "flex", gap: 12, alignItems: "center", color: "var(--s1-red)" }}>
      <Icon icon={TriangleAlert} />
      <span style={{ font: "500 15px/20px var(--font-sans)" }}>{text}</span>
    </Card>
  );
}

function PreviewBody({ p, onDrafts }: { p: QashierPreview; onDrafts: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [added, setAdded] = useState(false);
  const d = p.day!;
  const vars: Record<string, { n?: number; amount: string }> = {
    "categories-net": { n: d.categories.length, amount: bahtCents(d.netSales) },
    "payments-total": { n: d.payments.length, amount: bahtCents(d.totalSales) },
    "staff-transactions": { n: d.staff.length, amount: String(d.transactions) },
    "groups-total": { amount: baht(d.totalSales) },
    "no-unknown-categories": { amount: "" },
  };
  const rows = (p.recon ?? []).filter((r) => r.kind !== "unknown" || r.qashier.qty > 0 || r.desk.qty > 0);
  const byKind = (["membership", "daypass", "pt", "visits", "extra"] as const).map((kind) => {
    const pick = rows.filter((r) => r.kind === kind);
    const sum = (side: "desk" | "qashier") => ({ qty: pick.reduce((a, r) => a + r[side].qty, 0), amount: pick.reduce((a, r) => a + r[side].amount, 0) });
    return { kind, desk: sum("desk"), qashier: sum("qashier"), match: pick.every((r) => r.match) };
  });
  const cell = (x: { qty: number; amount: number }) => (x.qty ? `${x.qty} · ${baht(x.amount)}` : "0");
  const notInMenu = p.notInMenu ?? [];
  const catOf = (c: string) => (/(cloth|apparel|shirt|bra|shorts)/i.test(c) ? "shop" : "drinks");

  return (
    <>
      {p.state === "already" && <span className="s1-pill" style={{ alignSelf: "flex-start" }}>{t("imp.already")}</span>}
      {p.state === "replace" && (
        <span className="s1-pill" style={{ alignSelf: "flex-start", color: "var(--s1-yellow)", background: "var(--s1-yellow-tint)" }}>
          {t("imp.replaces", { v: p.existingVersion ?? 1 })}
        </span>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }} data-testid="import-checks">
        {d.checks.map((c) => (
          <Card key={c.id} title={c.detail} style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }} data-ok={c.ok}>
            <Disc tone={c.ok ? "go" : "warn"} style={{ width: 32, height: 32 }}>
              <Icon icon={c.ok ? Check : TriangleAlert} size={16} />
            </Disc>
            <span style={{ font: "600 14px/19px var(--font-sans)" }}>{t(`imp.check.${c.id}` as MessageKey, vars[c.id] ?? { amount: "" })}</span>
          </Card>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))", gap: 20, alignItems: "start" }}>
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="s1-section" style={{ margin: "0 0 0 4px" }}>
            {t("imp.deskVs")}
          </h2>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <table className="s1-adm-table">
              <thead>
                <tr>
                  <th>{t("imp.what")}</th>
                  <th>{t("imp.deskLogged")}</th>
                  <th>{t("imp.qashierRang")}</th>
                  <th aria-hidden />
                </tr>
              </thead>
              <tbody>
                {byKind.map((r) => (
                  <tr key={r.kind}>
                    <td>{t(`imp.row.${r.kind}`)}</td>
                    <td className="s1-num">{cell(r.desk)}</td>
                    <td className="s1-num">{cell(r.qashier)}</td>
                    <td style={{ color: r.match ? "var(--s1-green)" : "var(--s1-yellow)" }}>
                      <Icon icon={r.match ? Check : TriangleAlert} size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p style={{ margin: "0 4px", font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t("imp.deskNote")}</p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="s1-section" style={{ margin: "0 0 0 4px" }}>
            {t("imp.notInMenu")}
          </h2>
          <Card style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, boxShadow: notInMenu.length ? "inset 0 0 0 1px rgba(255,230,0,0.35)" : undefined }}>
            {notInMenu.length ? (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {notInMenu.map((x) => (
                    <span key={x.name} className="s1-pill s1-pill--plain" style={{ height: 32, padding: "0 12px", font: "600 14px/18px var(--font-sans)" }}>
                      {x.name} <span style={{ color: "var(--text-secondary)", marginLeft: 6 }}>{baht(x.price)}</span>
                    </span>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="tinted"
                  style={{ alignSelf: "flex-start" }}
                  disabled={added}
                  onClick={async () => {
                    try {
                      await admin.addDrafts(notInMenu.map((x) => ({ id: slug(x.name), category_id: catOf(x.category), name_en: x.name, price_thb: Math.round(x.price), qashier_products: [x.name] })));
                      setAdded(true);
                      toast(t("imp.draftsAdded", { n: notInMenu.length }));
                      onDrafts();
                    } catch (e) {
                      const u = toUiError(e);
                      toast(t(u.key, u.vars), { tone: "stop" });
                    }
                  }}
                >
                  {t("imp.addDrafts", { n: notInMenu.length })}
                </Button>
              </>
            ) : (
              <span style={{ color: "var(--text-secondary)", font: "500 14px/19px var(--font-sans)" }}>{t("imp.allInMenu")}</span>
            )}
            {(p.legacyCategories ?? []).map((name) => (
              <p key={name} style={{ margin: 0, font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>
                {t("imp.legacy", { name })}
              </p>
            ))}
            {(p.unmatchedStaff ?? []).length > 0 && (
              <p style={{ margin: 0, font: "500 13px/18px var(--font-sans)", color: "var(--s1-yellow)" }}>{t("imp.unmatchedStaff", { names: p.unmatchedStaff!.join(", ") })}</p>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
