import { createFileRoute } from "@tanstack/react-router";
import { AdminImport } from "../../../surfaces/world/admin/AdminImport";

export const Route = createFileRoute("/w/admin/import")({ component: AdminImport });
