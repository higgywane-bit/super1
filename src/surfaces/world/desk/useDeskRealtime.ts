import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabaseBrowser } from "../../../client/supabase";
import { playSound } from "../../../client/sound";

/**
 * Live desk (docs/02-CONNECTIONS.md): a counter sign-up appears in "Waiting at the counter" in under
 * 2 seconds with a soft chime; check-ins, sales, new members and PT sessions from any desk device or a
 * coach's phone update the Today feed. RLS applies to realtime too.
 */
export function useDeskRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const sb = supabaseBrowser();
    const inval = (...keys: string[][]) => keys.forEach((k) => void qc.invalidateQueries({ queryKey: k }));
    const ch = sb
      .channel("desk-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "signups" }, () => {
        playSound("chime");
        inval(["desk", "waiting"]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "signups" }, () => inval(["desk", "waiting"]))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "checkins" }, () => inval(["desk", "feed"]))
      .on("postgres_changes", { event: "*", schema: "public", table: "pt_sessions" }, () => inval(["desk", "feed"], ["desk", "pt"], ["desk", "detail"]))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity" }, () => inval(["desk", "feed"], ["desk", "detail"], ["desk", "members"]))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => inval(["desk", "messages"]))
      .subscribe();
    return () => {
      void sb.removeChannel(ch);
    };
  }, [qc]);
}
