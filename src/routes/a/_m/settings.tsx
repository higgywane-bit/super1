import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "../../../surfaces/app/member/SettingsPage";

export const Route = createFileRoute("/a/_m/settings")({ component: SettingsPage });
