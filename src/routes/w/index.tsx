import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "../../surfaces/shared/Gate";
import { DeskShell } from "../../surfaces/world/desk/DeskShell";
import { DeskSignIn } from "../../surfaces/world/desk/DeskSignIn";

export const Route = createFileRoute("/w/")({
  component: () => (
    <Gate area="desk" signIn={<DeskSignIn />}>
      <DeskShell />
    </Gate>
  ),
});
