import { createFileRoute } from "@tanstack/react-router";
import { AdminPlans } from "../../../surfaces/world/admin/AdminPlans";

export const Route = createFileRoute("/w/admin/plans")({ component: AdminPlans });
