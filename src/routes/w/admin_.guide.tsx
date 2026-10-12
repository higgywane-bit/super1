import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "../../surfaces/shared/Gate";
import { CodeSignInStaff } from "../../surfaces/world/CodeSignInStaff";
import { StaffGuide } from "../../surfaces/world/admin/StaffGuide";

/** The staff one-pager, outside the admin frame so it prints on its own (A06 → Staff one-pager). */
export const Route = createFileRoute("/w/admin_/guide")({
  head: () => ({ meta: [{ title: "SUPER1 · Staff one-pager" }] }),
  component: () => (
    <Gate area="admin" signIn={<CodeSignInStaff who="admin" />}>
      <StaffGuide />
    </Gate>
  ),
});
