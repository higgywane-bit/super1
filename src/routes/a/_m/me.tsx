import { createFileRoute } from "@tanstack/react-router";
import { MePage } from "../../../surfaces/app/member/MePage";

export const Route = createFileRoute("/a/_m/me")({ component: MePage });
