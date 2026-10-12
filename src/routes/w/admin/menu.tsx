import { createFileRoute } from "@tanstack/react-router";
import { AdminMenu } from "../../../surfaces/world/admin/AdminMenu";

export const Route = createFileRoute("/w/admin/menu")({ component: AdminMenu });
