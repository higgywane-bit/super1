import type { FeedRow, MemberCard } from "../../../client/desk";
import { baht, dayLabel, daysLeftText } from "../../../i18n/format";
import type { Lang, MessageKey, T } from "../../../i18n";

/** Status pill words + tone for a member (archived wins). */
export function statusOf(card: MemberCard | null | undefined, archived: boolean): { key: MessageKey; tone: "active" | "expiring" | "expired" | "pt" | "none" } {
  if (archived) return { key: "status.archived", tone: "none" };
  const s = card?.status ?? "none";
  const tone = s === "active" ? "active" : s === "expiring" ? "expiring" : s === "expired" ? "expired" : "none";
  return { key: `status.${s}` as MessageKey, tone };
}

/** The short line under a member's name: "1 Month · 19 days left · PT 6 left". */
export function memberSub(t: T, lang: Lang, card: MemberCard, opts: { archivedAt?: string | null; lastVisit?: string | null } = {}): string {
  if (opts.archivedAt) return t("sub.archived", { date: dayLabel(opts.archivedAt.slice(0, 10), lang) });
  const plan = card.plan ?? "";
  let line: string;
  switch (card.status) {
    case "active":
    case "expiring":
      line =
        card.days_left != null
          ? t("sub.days", { plan, days: daysLeftText(card.days_left, lang) })
          : t("desk.feed.visitsLeft", { plan, n: card.visits_left ?? 0 });
      break;
    case "paused":
      line = t("sub.pausedUntil", { plan, date: dayLabel(card.paused_until, lang) });
      break;
    case "upcoming":
      line = t("sub.startsOn", { plan, date: dayLabel(card.starts_on, lang) });
      break;
    case "expired":
      line = t("sub.ended", { plan, date: dayLabel(card.ended_on, lang) });
      break;
    default:
      line = opts.lastVisit ? t("sub.noPlan", { date: dayLabel(opts.lastVisit, lang) }) : t("sub.noPlanNever");
  }
  return card.pt_left != null ? t("sub.ptLeft", { line, n: card.pt_left }) : line;
}

/** Why the door said no, in words: "Expired Fri 9 Oct". */
export function reasonText(t: T, lang: Lang, reason: string | null | undefined, card?: MemberCard | null): string {
  switch (reason) {
    case "expired":
      return t("reason.expired", { date: dayLabel(card?.ended_on, lang) });
    case "paused":
      return t("reason.paused", { date: dayLabel(card?.paused_until, lang) });
    case "not-started":
      return t("reason.not-started", { date: dayLabel(card?.starts_on, lang) });
    case "archived":
    case "unknown-code":
    case "used-up":
    case "no-plan":
      return t(`reason.${reason}`);
    default:
      return reason ?? "";
  }
}

export function methodText(t: T, m: string | null | undefined): string {
  if (!m) return "";
  return t(`method.${m}` as MessageKey);
}

/** One Today-feed row as words: title, sub line, sub colour. */
export function feedWords(t: T, lang: Lang, r: FeedRow): { title: string; sub: string; color: string } {
  const x = (r.extra ?? {}) as Record<string, string | number | boolean | null>;
  switch (r.kind) {
    case "ok": {
      const c = r.card;
      const sub = !c
        ? ""
        : r.reason === "visits"
          ? t("desk.feed.visitsLeft", { plan: c.plan ?? "", n: c.visits_left ?? 0 })
          : c.days_left != null
            ? t("sub.days", { plan: c.plan ?? "", days: daysLeftText(c.days_left, lang) })
            : c.plan ?? "";
      return { title: r.name ?? "", sub, color: "var(--text-secondary)" };
    }
    case "daypass":
      return { title: t("desk.feed.dayPass"), sub: "", color: "var(--text-secondary)" };
    case "no":
      return {
        title: r.name ?? t("desk.feed.unknown", { code: r.code ?? "" }),
        sub: reasonText(t, lang, r.reason, r.card),
        color: "var(--s1-red)",
      };
    case "new": {
      const line = t("desk.feed.newMember", { plan: String(x.plan ?? ""), price: baht(Number(x.price ?? 0)), tag: String(x.tag ?? "") });
      return { title: r.name ?? "", sub: x.coach ? t("desk.feed.lead", { line, coach: String(x.coach) }) : line, color: "var(--s1-blue)" };
    }
    case "sale":
      return {
        title: r.name ?? "",
        sub: t("desk.feed.sold", { plan: String(x.plan ?? ""), price: baht(Number(x.price ?? 0)), method: methodText(t, x.method as string) }),
        color: "var(--text-secondary)",
      };
    case "pt":
      return { title: r.name ?? "", sub: t("desk.feed.ptLine", { coach: String(x.coach ?? ""), left: Number(x.left ?? 0), total: Number(x.total ?? 0) }), color: "var(--s1-pink)" };
  }
}
