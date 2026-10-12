import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "../../surfaces/shared/Gate";
import { CoachSignIn } from "../../surfaces/app/coach/CoachSignIn";

export const Route = createFileRoute("/a/coach")({
  head: () => ({ meta: [{ title: "SUPER1 · Coach" }] }),
  component: () => (
    <Gate area="coach" signIn={<CoachSignIn />}>
      <div />
    </Gate>
  ),
});
