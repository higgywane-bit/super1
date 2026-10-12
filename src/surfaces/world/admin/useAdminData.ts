import { useQuery } from "@tanstack/react-query";
import { admin } from "../../../client/admin";
import { owner } from "../../../client/owner";
import { andyGroup } from "../../../lib/qashier/parse";
import { useOwnerToday } from "../owner/useOwnerData";

/** Pete's inbox: open merge requests, unread desk messages, Qashier alerts (failed checks, products not in the menu, unmatched logins). */
export function useInbox() {
  const merges = useQuery({ queryKey: ["admin", "merges"], queryFn: admin.mergeRequests, refetchInterval: 60_000 });
  const messages = useQuery({ queryKey: ["admin", "messages"], queryFn: admin.messages, refetchInterval: 60_000 });
  const menu = useQuery({ queryKey: ["admin", "menu"], queryFn: admin.menu, staleTime: 60_000 });
  const today = useOwnerToday();
  const lines = today.lines;
  const inMenu = new Set((menu.data?.items ?? []).flatMap((i) => i.qashier_products.map((p) => p.trim())));
  const notInMenu = menu.data ? lines.filter((l) => l.section === "product" && andyGroup(l.category ?? "") !== "gym" && !inMenu.has(l.name.trim())) : [];
  const known = new Set(today.staff.map((s) => s.qashier_name?.trim().toLowerCase()).filter(Boolean));
  const unmatched = lines.filter((l) => l.section === "staff" && !known.has(l.name.trim().toLowerCase())).map((l) => l.name);
  const failed = (today.day?.checks ?? []).filter((c) => !c.ok);
  const unread = (messages.data ?? []).filter((m) => m.from_side === "desk" && !m.read_at);
  const drafts = (menu.data?.items ?? []).filter((i) => i.is_draft).length;
  const count = (merges.data?.length ?? 0) + (unread.length ? 1 : 0) + (notInMenu.length ? 1 : 0) + (failed.length ? 1 : 0) + (unmatched.length ? 1 : 0);
  return { merges: merges.data ?? [], messages: messages.data ?? [], unread, notInMenu, unmatched, failed, drafts, count, today };
}

export function useImportedDays() {
  return useQuery({ queryKey: ["admin", "days"], queryFn: owner.importedDays });
}
