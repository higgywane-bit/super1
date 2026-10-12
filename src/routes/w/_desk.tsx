import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Gate } from "../../surfaces/shared/Gate";
import { DeskProvider, useDesk } from "../../surfaces/world/desk/DeskContext";
import { DeskSheets } from "../../surfaces/world/desk/DeskSheets";
import { DeskShell } from "../../surfaces/world/desk/DeskShell";
import { DeskSignIn } from "../../surfaces/world/desk/DeskSignIn";
import { ShiftPicker } from "../../surfaces/world/desk/ShiftPicker";
import { useDeskRealtime } from "../../surfaces/world/desk/useDeskRealtime";

/** The front desk (super1.world/): shared login → who's on shift → check-in and members. */
export const Route = createFileRoute("/w/_desk")({
  ssr: false,
  component: () => (
    <Gate area="desk" signIn={<DeskSignIn />}>
      <DeskProvider>
        <DeskFrame />
      </DeskProvider>
    </Gate>
  ),
});

function DeskFrame() {
  const { shift } = useDesk();
  if (!shift) return <ShiftPicker />;
  return <DeskLive />;
}

function DeskLive() {
  useDeskRealtime();
  return (
    <DeskShell>
      <Outlet />
      <DeskSheets />
    </DeskShell>
  );
}
