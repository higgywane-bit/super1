import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Search, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { desk } from "../../../client/desk";
import { Avatar, Button, Group, Icon, Pill, RowButton, Segmented } from "../../../components/kit";
import { useI18n, type MessageKey } from "../../../i18n";
import { useDesk } from "./DeskContext";
import { memberSub, statusOf } from "./words";

const FILTERS = ["all", "active", "expiring", "expired", "paused", "none", "archived"] as const;
type Filter = (typeof FILTERS)[number];

/** D05 · Members: search name/phone/tag, filters, rows with plan line, tag and status pill. */
export function MembersPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { open } = useDesk();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q), 200);
    return () => clearTimeout(id);
  }, [q]);
  const list = useQuery({ queryKey: ["desk", "members", debounced, filter], queryFn: () => desk.members(debounced, filter), placeholderData: (p) => p });

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <h1 className="s1-largetitle">{t("desk.members")}</h1>
        <Button onClick={() => open({ type: "newMember" })}>
          <Icon icon={UserPlus} />
          {t("desk.newMember")}
        </Button>
      </header>
      <div style={{ position: "relative" }}>
        <Icon icon={Search} style={{ position: "absolute", left: 16, top: 14, color: "var(--text-secondary)" }} />
        <label htmlFor="d-q" className="sr-only">
          {t("desk.search")}
        </label>
        <input id="d-q" className="s1-input" placeholder={t("desk.search")} value={q} onChange={(e) => setQ(e.target.value)} style={{ height: 48, paddingLeft: 48 }} />
      </div>
      <div style={{ overflowX: "auto", maxWidth: "100%" }}>
        <Segmented label={t("desk.members")} value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f, label: t(`filter.${f}` as MessageKey) }))} />
      </div>
      <Group className="s1-stagger">
        {(list.data ?? []).map((m) => {
          const st = statusOf(m.card, m.archived);
          return (
            <RowButton
              key={m.id}
              onClick={() => void navigate({ to: "/w/members/$memberId", params: { memberId: m.id } })}
              leading={<Avatar name={m.name} />}
              title={m.name}
              sub={memberSub(t, lang, m.card, { archivedAt: m.archived_at, lastVisit: m.last_visit })}
              meta={
                <>
                  <span className="s1-num" style={{ width: 80, font: "500 14px/19px var(--font-sans)", color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>
                    {m.tag ?? ""}
                  </span>
                  <Pill tone={st.tone}>{t(st.key)}</Pill>
                </>
              }
            />
          );
        })}
        {list.isFetched && !list.data?.length && <RowButton title={t("desk.noResults")} disabled />}
      </Group>
    </div>
  );
}
