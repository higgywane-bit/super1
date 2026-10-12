import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, GitMerge } from "lucide-react";
import { useState } from "react";
import { admin, type MergeRequest } from "../../../client/admin";
import { owner } from "../../../client/owner";
import { toUiError } from "../../../client/errors";
import { Avatar, Button, Card, Disc, Group, Icon, Row, TextArea, useToast } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { baht, dayLabel, time } from "../../../i18n/format";
import { localDate } from "../../../lib/dates";
import { reconcile, reconTotals, type ReconPlan } from "../../../lib/qashier/reconcile";
import { useViewer } from "../../shared/Gate";
import { cafe, membershipsSold } from "../owner/derive";
import { PageHeader } from "../StaffSidebar";
import { MergeSheet } from "./MergeSheet";
import { useInbox } from "./useAdminData";

const no = (n: number) => String(n).padStart(4, "0");

/** Admin · Dashboard: everything Andy sees, plus the inbox (merges, desk messages, Qashier alerts). */
export function AdminDashboard() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const viewer = useViewer();
  const qc = useQueryClient();
  const inbox = useInbox();
  const d = inbox.today;
  const week = useQuery({ queryKey: ["owner", "week", d.today], queryFn: () => owner.week(d.today) });
  const members = useQuery({ queryKey: ["owner", "members", d.today], queryFn: () => owner.members(d.today) });
  const packs = useQuery({ queryKey: ["admin", "packs", d.today], queryFn: () => admin.ptPacks(d.today) });
  const coaches = useQuery({ queryKey: ["admin", "coaches"], queryFn: admin.coaches });
  const staff = useQuery({ queryKey: ["admin", "staff"], queryFn: admin.staff });
  const [review, setReview] = useState<MergeRequest | null>(null);
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");

  const day = d.day;
  const sold = membershipsSold(d.lines);
  const recon = day ? reconTotals(reconcile(d.plans as ReconPlan[], d.desk, d.lines.filter((l) => l.section === "product").map((l) => ({ name: l.name, category: l.category ?? "", qty: l.qty, exVat: 0, till: l.till })), d.lines.filter((l) => l.section === "modifier").map((l) => ({ name: l.name, qty: l.qty, exVat: 0, till: l.till }))), ["membership", "visits"]) : null;
  const c = cafe(d.lines, new Set(d.plans.map((p) => p.qashier_modifier).filter(Boolean) as string[]));
  const days = week.data ?? [];
  const max = Math.max(1, ...days.map((x) => Number(x.total ?? 0)));
  const staffName = (id: string | null) => staff.data?.find((s) => s.id === id)?.name ?? "Desk";
  const lastDesk = inbox.unread[0];

  const kpi = (title: string, value: string, foot: string, footColor?: string) => (
    <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ font: "600 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{title}</span>
      <span className="s1-num s1-pop" style={{ font: "700 30px/36px var(--font-sans)", letterSpacing: "-0.02em" }}>
        {value}
      </span>
      <span style={{ font: "500 13px/18px var(--font-sans)", color: footColor ?? "var(--text-secondary)" }}>{foot}</span>
    </Card>
  );

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title={t("admin.dashboard")} sub={t("admin.dashSub", { day: dayLabel(d.today, lang) })} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {kpi(t("admin.kSales"), day ? baht(day.total_sales) : "—", day ? t("admin.kSalesSub", { n: day.transactions, time: day.business_date === d.today ? time(day.imported_at) : dayLabel(day.business_date, lang) }) : t("owner.notImported"))}
        {kpi(t("admin.kVisits"), `${d.visits?.members ?? 0} + ${d.visits?.day_passes ?? 0}`, t("admin.kVisitsSub"))}
        {kpi(
          t("admin.kMemberships"),
          String(sold.reduce((a, r) => a + r.qty, 0)),
          recon ? (recon.match ? t("admin.kMatch", { amount: baht(sold.reduce((a, r) => a + r.till, 0)) }) : t("admin.kNoMatch", { amount: baht(sold.reduce((a, r) => a + r.till, 0)) })) : "—",
          recon ? (recon.match ? "var(--s1-green)" : "var(--s1-yellow)") : undefined,
        )}
        {kpi(t("admin.kCafe"), day ? baht(c.total) : "—", day ? t("admin.kCafeSub", { n: c.items, top: c.top[0]?.name ?? "—" }) : "")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(380px, 100%), 1fr))", gap: 20, alignItems: "start" }}>
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 className="s1-section" style={{ margin: "0 0 0 4px" }}>
              {t("admin.inbox")}
            </h2>
            {inbox.count > 0 && <span className="s1-pill" style={{ height: 22, color: "var(--on-blue)", background: "var(--s1-blue)" }}>{inbox.count}</span>}
          </div>
          {inbox.count === 0 && <Card style={{ padding: 18, color: "var(--text-secondary)", font: "500 15px/22px var(--font-sans)" }}>{t("admin.inboxEmpty")}</Card>}
          {inbox.merges.map((r) => (
            <Card key={r.id} className="s1-slide-down" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, boxShadow: "inset 0 0 0 1px rgba(0,180,255,0.35)" }}>
              <div style={{ display: "flex", gap: 14 }}>
                <Disc tone="money">
                  <Icon icon={GitMerge} />
                </Disc>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <span className="s1-headline">{t("admin.mergeTitle", { name: r.duplicate.name, dup: no(r.duplicate.member_no), keep: no(r.keep.member_no) })}</span>
                  <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>
                    {t("admin.mergeSub", { by: r.by ?? "—", time: time(r.requested_at) })}
                    {r.note ? ` · ${r.note}` : ""}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Button size="sm" onClick={() => setReview(r)}>
                  {t("admin.reviewMerge")}
                </Button>
                <Button
                  size="sm"
                  variant="plain"
                  style={{ color: "var(--text-secondary)" }}
                  onClick={() => void admin.reject(r.id).then(() => {
                    toast(t("admin.rejected"));
                    void qc.invalidateQueries({ queryKey: ["admin", "merges"] });
                  })}
                >
                  {t("admin.notDuplicate")}
                </Button>
              </div>
            </Card>
          ))}
          {lastDesk && (
            <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 14 }}>
                <Avatar name={staffName(lastDesk.staff_id)} style={{ background: "var(--s1-yellow-tint)", color: "var(--s1-yellow)" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <span className="s1-headline">{t("admin.deskMessage", { name: staffName(lastDesk.staff_id), time: time(lastDesk.created_at) })}</span>
                  {inbox.unread
                    .slice()
                    .reverse()
                    .map((m) => (
                      <span key={m.id} style={{ font: "500 14px/20px var(--font-sans)", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                        “{m.body}”
                      </span>
                    ))}
                </div>
              </div>
              {replying ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <TextArea aria-label={t("admin.reply")} placeholder={t("admin.replyPh")} value={reply} onChange={(e) => setReply(e.target.value)} autoFocus />
                  <Button
                    size="sm"
                    style={{ alignSelf: "flex-start" }}
                    disabled={!reply.trim() || !viewer}
                    onClick={async () => {
                      try {
                        await admin.reply(reply.trim(), viewer!.id);
                        setReply("");
                        setReplying(false);
                        toast(t("admin.replied"));
                        void qc.invalidateQueries({ queryKey: ["admin", "messages"] });
                      } catch (e) {
                        const u = toUiError(e);
                        toast(t(u.key, u.vars), { tone: "stop" });
                      }
                    }}
                  >
                    {t("admin.send")}
                  </Button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10 }}>
                  <Button size="sm" variant="plain" style={{ color: "var(--foreground)" }} onClick={() => setReplying(true)}>
                    {t("admin.reply")}
                  </Button>
                  <Button size="sm" variant="tinted" onClick={() => void navigate({ to: "/w/admin/plans" })}>
                    {t("admin.plans")}
                  </Button>
                </div>
              )}
            </Card>
          )}
          {(inbox.notInMenu.length > 0 || inbox.failed.length > 0 || inbox.unmatched.length > 0) && (
            <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, boxShadow: "inset 0 0 0 1px rgba(255,230,0,0.35)" }}>
              <div style={{ display: "flex", gap: 14 }}>
                <Disc tone="warn">
                  <Icon icon={AlertCircle} />
                </Disc>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                  {inbox.failed.length > 0 && day && <span className="s1-headline">{t("admin.qAlertChecks", { day: dayLabel(day.business_date, lang) })}</span>}
                  {inbox.notInMenu.length > 0 && day && (
                    <>
                      <span className="s1-headline">{t("admin.qAlertMenu", { n: inbox.notInMenu.length })}</span>
                      <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>
                        {t("admin.qAlertMenuSub", { day: dayLabel(day.business_date, lang), names: inbox.notInMenu.map((l) => l.name.replace(/\s*\(.*$/, "")).join(", ") })}
                      </span>
                    </>
                  )}
                  {inbox.unmatched.length > 0 && <span style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-secondary)" }}>{t("admin.qAlertStaff", { names: inbox.unmatched.join(", ") })}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button size="sm" variant="plain" style={{ color: "var(--foreground)" }} onClick={() => void navigate({ to: "/w/admin/import" })}>
                  {t("admin.reviewImport")}
                </Button>
                {inbox.unmatched.length > 0 && (
                  <Button size="sm" variant="plain" onClick={() => void navigate({ to: "/w/admin/people" })}>
                    {t("admin.matchStaff")}
                  </Button>
                )}
              </div>
            </Card>
          )}
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="s1-section" style={{ margin: "0 0 0 4px" }}>
            {t("admin.thisWeek")}
          </h2>
          <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <span className="s1-num" style={{ font: "700 24px/30px var(--font-sans)" }}>
              {baht(days.reduce((a, x) => a + Number(x.total ?? 0), 0))}
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6, alignItems: "end", height: 120 }}>
              {days.map((x) => (
                <div key={x.day} style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                  <span
                    className="s1-bar-grow"
                    title={x.imported ? baht(Number(x.total)) : t("owner.notImported")}
                    style={{
                      height: x.imported ? Math.max(6, (Number(x.total) / max) * 90) : 90,
                      borderRadius: 8,
                      background: !x.imported ? "repeating-linear-gradient(135deg, var(--surface-3) 0 6px, var(--surface-2) 6px 12px)" : x.day === localDate() ? "var(--s1-blue)" : "var(--surface-4)",
                    }}
                  />
                  <span style={{ font: "500 12px/16px var(--font-sans)", color: "var(--text-secondary)", textAlign: "center" }}>{dayLabel(x.day, lang).split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </Card>
          <h2 className="s1-section" style={{ margin: "8px 0 0 4px" }}>
            {t("admin.ptMonth")}
          </h2>
          <Group>
            {(coaches.data ?? [])
              .filter((co) => co.portal !== "house")
              .map((co) => {
                const sessions = members.data?.pt_by_coach.find((x) => x.coach === co.name)?.sessions ?? 0;
                const clients = new Set((packs.data ?? []).filter((p) => p.coach_id === co.id).map((p) => p.member_id)).size;
                return { co, sessions, clients };
              })
              .sort((a, b) => b.sessions - a.sessions || b.clients - a.clients)
              .slice(0, 6)
              .map(({ co, sessions, clients }) => (
                <Row
                  key={co.id}
                  leading={<Avatar name={co.full_name || co.name} style={{ background: "var(--s1-pink-tint)", color: "var(--s1-pink)" }} />}
                  title={co.full_name || co.name}
                  meta={
                    <span style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>{t("admin.clients", { n: clients })}</span>
                      <span className="s1-num" style={{ font: "700 16px/20px var(--font-sans)", color: "var(--s1-pink)", width: 28, textAlign: "right" }}>
                        {sessions}
                      </span>
                    </span>
                  }
                />
              ))}
          </Group>
        </section>
      </div>
      <MergeSheet req={review} onClose={() => setReview(null)} onDone={() => void qc.invalidateQueries({ queryKey: ["admin", "merges"] })} />
    </div>
  );
}
