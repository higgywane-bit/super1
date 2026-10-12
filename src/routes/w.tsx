import { createFileRoute, Outlet } from "@tanstack/react-router";

/** super1.world: front desk (/), Andy (/owner), Pete (/admin). */
export const Route = createFileRoute("/w")({
  head: () => ({ meta: [{ title: "SUPER1 · Superfit" }] }),
  component: Outlet,
});
