import { createFileRoute } from "@tanstack/react-router";
import { CoachHome } from "../../../surfaces/app/coach/CoachHome";

export const Route = createFileRoute("/a/coach/")({ component: CoachHome });
