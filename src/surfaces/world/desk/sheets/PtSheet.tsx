import { useQuery } from "@tanstack/react-query";
import { Dumbbell } from "lucide-react";
import { useState } from "react";
import { desk, type PtClient } from "../../../../client/desk";
import { toUiError } from "../../../../client/errors";
import { Disc, Group, Icon, Input, Label, Row, useToast } from "../../../../components/kit";
import { useI18n } from "../../../../i18n";
import { useDesk } from "../DeskContext";
import { SheetHeader } from "./SheetHeader";

/** D09 · Log a PT session: search a PT client, Use 1 session (undo for 10 minutes). */
export function PtSheet() {
  const { t } = useI18n();
  const toast = useToast();
  const { shift, close, refresh } = useDesk();
  const [q, setQ] = useState("");
  const list = useQuery({ queryKey: ["desk", "pt", q], queryFn: () => desk.ptClients(q), placeholderData: (p) => p });

  async function use(c: PtClient) {
    if (!shift) return;
    try {
      const r = await desk.useSession(c.member_id, shift.staffId);
      refresh();
      close();
      toast(t("desk.ptToast", { name: c.name, left: r.left, total: r.total }), {
        ms: 10_000,
        action: {
          label: t("desk.undo"),
          onClick: () =>
            void desk.undoSession(r.session_id, shift.staffId).then(() => {
              refresh();
              toast(t("desk.undone", { left: r.left + 1 }));
            }),
        },
      });
    } catch (e) {
      const u = toUiError(e);
      toast(t(u.key, u.vars), { tone: "stop" });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SheetHeader title={t("desk.logPt")} onClose={close} />
      <div>
        <Label htmlFor="d-ptq">{t("desk.clientName")}</Label>
        <Input id="d-ptq" placeholder={t("desk.searchPt")} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      </div>
      <Group>
        {(list.data ?? []).map((c) => (
          <Row
            key={c.member_id + c.coach}
            leading={
              <Disc tone="pt">
                <Icon icon={Dumbbell} />
              </Disc>
            }
            title={c.name}
            sub={t("desk.ptLeft", { coach: c.coach, left: c.left, total: c.total })}
            meta={
              <button className="s1-btn s1-btn--sm" type="button" onClick={() => void use(c)} style={{ background: "var(--s1-pink)", color: "#000" }}>
                {t("desk.useSession")}
              </button>
            }
          />
        ))}
        {list.isFetched && !list.data?.length && <Row title={t("desk.noPtClients")} />}
      </Group>
      <p style={{ margin: 0, font: "500 14px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{t("desk.ptNote")}</p>
    </div>
  );
}
