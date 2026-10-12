import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "../../surfaces/shared/Gate";
import { CodeSignInStaff } from "../../surfaces/world/CodeSignInStaff";
import { OwnerShell } from "../../surfaces/world/owner/OwnerShell";

export const Route = createFileRoute("/w/owner")({
  head: () => ({ meta: [{ title: "SUPER1 · Owner" }] }),
  component: () => (
    <Gate area="owner" signIn={<CodeSignInStaff who="owner" />}>
      <OwnerShell />
    </Gate>
  ),
});
