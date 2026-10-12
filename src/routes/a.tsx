import { createFileRoute, Outlet } from "@tanstack/react-router";

/** super1.app: member app (/), counter QR (/join), coach portal (/coach). */
export const Route = createFileRoute("/a")({
  head: () => ({ meta: [{ title: "SUPER1" }] }),
  component: Outlet,
});
