import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "../../../surfaces/world/admin/AdminDashboard";

export const Route = createFileRoute("/w/admin/")({ component: AdminDashboard });
