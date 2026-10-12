import { Sheet } from "../../../components/kit";
import { useT } from "../../../i18n";
import { useDesk } from "./DeskContext";
import { ArchiveSheet } from "./sheets/ArchiveSheet";
import { LinkSheet } from "./sheets/LinkSheet";
import { AddTagSheet, DayPassSheet, MessageSheet, NewMemberSheet } from "./sheets/MiscSheets";
import { EndPauseSheet, PauseSheet } from "./sheets/PauseSheets";
import { PtSheet } from "./sheets/PtSheet";
import { SellSheet } from "./sheets/SellSheet";
import { SignupSheet } from "./sheets/SignupSheet";

/** Desk sheets slide in from the right (Motion #7). One open at a time. */
export function DeskSheets() {
  const t = useT();
  const { sheet, close } = useDesk();
  const s = sheet;
  const title =
    s?.type === "sell" ? t("desk.sellRenew") : s?.type === "pt" ? t("desk.logPt") : s?.type === "message" ? t("desk.msgTitle") : s?.type === "archive" ? t("desk.archiveOrMerge") : t("desk.checkIn");
  return (
    <Sheet open={!!s} onClose={close} title={title} side="right" closeLabel={t("common.close")}>
      {s?.type === "sell" && <SellSheet key={s.memberId} memberId={s.memberId} planId={s.planId} />}
      {s?.type === "signup" && <SignupSheet key={s.signup.id} signup={s.signup} />}
      {s?.type === "link" && <LinkSheet key={s.signup.id} signup={s.signup} />}
      {s?.type === "pt" && <PtSheet />}
      {s?.type === "archive" && <ArchiveSheet memberId={s.memberId} />}
      {s?.type === "pause" && <PauseSheet memberId={s.memberId} />}
      {s?.type === "endPause" && <EndPauseSheet memberId={s.memberId} pauseId={s.pauseId} from={s.from} until={s.until} />}
      {s?.type === "message" && <MessageSheet />}
      {s?.type === "daypass" && <DayPassSheet />}
      {s?.type === "addTag" && <AddTagSheet memberId={s.memberId} />}
      {s?.type === "newMember" && <NewMemberSheet />}
    </Sheet>
  );
}
