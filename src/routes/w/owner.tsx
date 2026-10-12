import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "../../surfaces/shared/Gate";
import { CodeSignInStaff } from "../../surfaces/world/CodeSignInStaff";
import { OwnerApp } from "../../surfaces/world/owner/OwnerApp";

export const Route = createFileRoute("/w/owner")({
  ssr: false,
  head: () => ({
    meta: [{ title: "SUPER1 · Owner" }, { name: "apple-mobile-web-app-capable", content: "yes" }, { name: "apple-mobile-web-app-title", content: "SUPER1" }],
    links: [{ rel: "manifest", href: "/manifest-owner.webmanifest" }],
  }),
  component: () => (
    <Gate area="owner" signIn={<CodeSignInStaff who="owner" />}>
      <OwnerApp />
    </Gate>
  ),
});
