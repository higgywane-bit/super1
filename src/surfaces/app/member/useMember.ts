import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { flushWorkouts, member } from "../../../client/member";
import { supabaseBrowser } from "../../../client/supabase";

/** Link the login to the member on first sign-in (by the invited email), then read Home. */
export function useMemberLink() {
  return useQuery({ queryKey: ["member", "link"], queryFn: member.link, staleTime: Infinity, retry: 1 });
}

export function useMemberHome() {
  const link = useMemberLink();
  return useQuery({ queryKey: ["member", "home"], queryFn: member.home, enabled: !!link.data?.member_id, refetchInterval: 120_000 });
}

export function useMenu() {
  return useQuery({ queryKey: ["member", "menu"], queryFn: member.menu, staleTime: 300_000 });
}

/**
 * Live coach changes (docs/02-CONNECTIONS.md): program versions, targets, notes, picks and PT sessions
 * refresh Home without a reload. RLS sends each member only their own rows. Also sends any workout that
 * was finished offline, at start and when the phone is back online.
 */
export function useMemberLive() {
  const qc = useQueryClient();
  useEffect(() => {
    const sb = supabaseBrowser();
    const refresh = () => void qc.invalidateQueries({ queryKey: ["member", "home"] });
    const ch = sb.channel("member-live");
    for (const table of ["program_versions", "nutrition_targets", "coach_notes", "coach_picks", "pt_sessions"]) ch.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    ch.subscribe();
    const flush = () =>
      void flushWorkouts().then((r) => {
        if (r.length) void qc.invalidateQueries({ queryKey: ["member"] });
      });
    flush();
    window.addEventListener("online", flush);
    return () => {
      window.removeEventListener("online", flush);
      void sb.removeChannel(ch);
    };
  }, [qc]);
}
