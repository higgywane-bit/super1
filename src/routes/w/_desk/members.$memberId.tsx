import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "../../../surfaces/world/desk/ProfilePage";

export const Route = createFileRoute("/w/_desk/members/$memberId")({
  component: function Profile() {
    const { memberId } = Route.useParams();
    return <ProfilePage key={memberId} memberId={memberId} />;
  },
});
