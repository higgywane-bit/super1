import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Gate } from "../../surfaces/shared/Gate";
import { MemberShell } from "../../surfaces/app/member/MemberShell";
import { MemberSignIn } from "../../surfaces/app/member/MemberSignIn";

/** The member app (super1.app): every screen behind the member sign-in. */
export const Route = createFileRoute("/a/_m")({
  ssr: false,
  head: () => ({
    meta: [{ title: "SUPER1" }, { name: "apple-mobile-web-app-capable", content: "yes" }, { name: "apple-mobile-web-app-title", content: "SUPER1" }],
    links: [{ rel: "manifest", href: "/manifest-app.webmanifest" }],
  }),
  component: () => (
    <Gate area="member" signIn={<MemberSignIn />}>
      <MemberShell>
        <Outlet />
      </MemberShell>
    </Gate>
  ),
});
