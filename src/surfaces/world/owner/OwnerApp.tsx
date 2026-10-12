import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabaseBrowser } from "../../../client/supabase";
import { CafeTab } from "./CafeTab";
import { MembersTab } from "./MembersTab";
import { OwnerShell } from "./OwnerShell";
import { TodayTab } from "./TodayTab";
import { useOwnerToday } from "./useOwnerData";
import { WeekTab } from "./WeekTab";

/** Andy's app at super1.world/owner. The live pulse follows check-ins over realtime. */
export function OwnerApp() {
  const d = useOwnerToday();
  const qc = useQueryClient();
  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb
      .channel("owner-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "checkins" }, () => void qc.invalidateQueries({ queryKey: ["owner", "visits"] }))
      .subscribe();
    return () => {
      void sb.removeChannel(ch);
    };
  }, [qc]);
  return (
    <OwnerShell>
      {(tab) => (tab === "today" ? <TodayTab d={d} /> : tab === "week" ? <WeekTab /> : tab === "members" ? <MembersTab /> : <CafeTab d={d} />)}
    </OwnerShell>
  );
}
