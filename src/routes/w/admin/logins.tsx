import { createFileRoute } from "@tanstack/react-router";
import { AdminLogins } from "../../../surfaces/world/admin/AdminLogins";

export const Route = createFileRoute("/w/admin/logins")({ component: AdminLogins });
