import { createFileRoute } from "@tanstack/react-router";
import { ClientPage, type ClientTab } from "../../../surfaces/app/coach/ClientPage";

const TABS: ClientTab[] = ["program", "nutrition", "checkins"];

export const Route = createFileRoute("/a/coach/clients/$memberId")({
  validateSearch: (s: Record<string, unknown>): { tab: ClientTab } => ({ tab: TABS.includes(s.tab as ClientTab) ? (s.tab as ClientTab) : "program" }),
  component: function Client() {
    const { memberId } = Route.useParams();
    const { tab } = Route.useSearch();
    return <ClientPage memberId={memberId} tab={tab} />;
  },
});
