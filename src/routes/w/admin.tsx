import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Gate } from "../../surfaces/shared/Gate";
import { CodeSignInStaff } from "../../surfaces/world/CodeSignInStaff";
import { AdminShell } from "../../surfaces/world/admin/AdminShell";

export const Route = createFileRoute("/w/admin")({
  head: () => ({ meta: [{ title: "SUPER1 · Admin" }] }),
  component: () => (
    <Gate area="admin" signIn={<CodeSignInStaff who="admin" />}>
      <AdminShell>
        <Outlet />
      </AdminShell>
    </Gate>
  ),
});
