import { createFileRoute, redirect } from "@tanstack/react-router";

/** Only reached on preview hosts (production hosts always carry a surface prefix). */
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ href: "/w" });
  },
});
