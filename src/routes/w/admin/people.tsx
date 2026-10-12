import { createFileRoute } from "@tanstack/react-router";
import { AdminPeople } from "../../../surfaces/world/admin/AdminPeople";

export const Route = createFileRoute("/w/admin/people")({ component: AdminPeople });
