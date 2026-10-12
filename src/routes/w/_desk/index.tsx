import { createFileRoute } from "@tanstack/react-router";
import { CheckInPage } from "../../../surfaces/world/desk/CheckInPage";

export const Route = createFileRoute("/w/_desk/")({ component: CheckInPage });
