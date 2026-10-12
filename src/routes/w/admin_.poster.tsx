import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "../../surfaces/shared/Gate";
import { CodeSignInStaff } from "../../surfaces/world/CodeSignInStaff";
import { QrPoster } from "../../surfaces/world/admin/QrPoster";

/** The counter QR stand, outside the admin frame so it prints on its own (A06 → Download poster). */
export const Route = createFileRoute("/w/admin_/poster")({
  head: () => ({ meta: [{ title: "SUPER1 · Counter QR" }] }),
  component: () => (
    <Gate area="admin" signIn={<CodeSignInStaff who="admin" />}>
      <QrPoster />
    </Gate>
  ),
});
