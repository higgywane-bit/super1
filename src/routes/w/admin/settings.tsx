import { createFileRoute } from "@tanstack/react-router";
import { AdminSettings } from "../../../surfaces/world/admin/AdminSettings";

export const Route = createFileRoute("/w/admin/settings")({ component: AdminSettings });
