import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { desk, type Signup } from "../../../../client/desk";
import { toUiError } from "../../../../client/errors";
import { Button, Card, Segmented, useToast } from "../../../../components/kit";
import { useI18n } from "../../../../i18n";
import { LANG_NAMES } from "../../../../i18n/format";
import { useDesk } from "../DeskContext";
import { Note, SheetHeader } from "./SheetHeader";

/** An existing member asked on the counter QR to link their tag and email. The desk checks it's them. */
export function LinkSheet({ signup: s }: { signup: Signup }) {
  const { t } = useI18n();
  const toast = useToast();
  const { shift, close, refresh } = useDesk();
  const tag = s.link_tag ?? "";
  const who = useQuery({ queryKey: ["desk", "byTag", tag], queryFn: () => desk.memberByTag(tag), enabled: !!tag });
  const [useNew, setUseNew] = useState<"new" | "old">("new");
  const [busy, setBusy] = useState(false);
  const name = `${s.first_name} ${s.last_name}`.trim();
  const m = who.data?.members as { member_no: number; first_name: string; last_name: string; email: string | null } | undefined;
  const differs = !!(m?.email && s.email && m.email.toLowerCase() !== s.email.toLowerCase());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SheetHeader title={t("desk.link.title")} sub={[LANG_NAMES[s.lang], s.phone].filter(Boolean).join(" · ")} onClose={close} />
      <Note>{t("desk.link.body", { name, tag, email: s.email ?? "—" })}</Note>
      {who.isFetched &&
        (m ? (
          <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, boxShadow: "inset 0 0 0 1px rgba(0,180,255,0.3)" }}>
            <span className="s1-headline">{t("desk.link.member", { tag, name: `${m.first_name} ${m.last_name}`.trim(), no: m.member_no })}</span>
            {differs && (
              <>
                <span style={{ font: "500 14px/20px var(--font-sans)", color: "var(--text-secondary)" }}>{t("desk.link.emailDiffers", { email: m.email ?? "" })}</span>
                <Segmented
                  label={t("desk.email")}
                  value={useNew}
                  onChange={setUseNew}
                  options={[
                    { value: "new", label: t("desk.link.useNew") },
                    { value: "old", label: t("desk.link.keep") },
                  ]}
                />
              </>
            )}
            <Button
              disabled={busy || !shift}
              onClick={async () => {
                if (!shift) return;
                setBusy(true);
                try {
                  const r = await desk.completeLink(s.id, shift.staffId, !differs || useNew === "new");
                  refresh();
                  close();
                  toast(t("desk.link.done", { email: r.email ?? "—" }));
                } catch (e) {
                  const u = toUiError(e);
                  toast(t(u.key, u.vars), { tone: "stop" });
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("desk.link.confirm")}
            </Button>
          </Card>
        ) : (
          <p role="alert" style={{ margin: 0, color: "var(--s1-red)", font: "500 15px/22px var(--font-sans)" }}>
            {t("desk.link.notFound", { tag })}
          </p>
        ))}
    </div>
  );
}
