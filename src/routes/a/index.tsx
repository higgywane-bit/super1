import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "../../surfaces/shared/Gate";
import { MemberShell } from "../../surfaces/app/member/MemberShell";
import { MemberSignIn } from "../../surfaces/app/member/MemberSignIn";

export const Route = createFileRoute("/a/")({
  component: () => (
    <Gate area="member" signIn={<MemberSignIn />}>
      <MemberShell />
    </Gate>
  ),
});
