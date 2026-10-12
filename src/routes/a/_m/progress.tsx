import { createFileRoute } from "@tanstack/react-router";
import { ProgressPage } from "../../../surfaces/app/member/ProgressPage";

export const Route = createFileRoute("/a/_m/progress")({ component: ProgressPage });
