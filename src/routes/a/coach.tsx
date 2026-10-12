import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Gate } from "../../surfaces/shared/Gate";
import { CoachShell } from "../../surfaces/app/coach/CoachShell";
import { CoachSignIn } from "../../surfaces/app/coach/CoachSignIn";

export const Route = createFileRoute("/a/coach")({
  head: () => ({ meta: [{ title: "SUPER1 · Coach" }] }),
  ssr: false,
  component: () => (
    <Gate area="coach" signIn={<CoachSignIn />}>
      <CoachShell>
        <Outlet />
      </CoachShell>
    </Gate>
  ),
});
