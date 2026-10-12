import { createFileRoute } from "@tanstack/react-router";
import { MembersPage } from "../../../surfaces/world/desk/MembersPage";

export const Route = createFileRoute("/w/_desk/members/")({ component: MembersPage });
