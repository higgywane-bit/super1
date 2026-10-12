import { createFileRoute } from "@tanstack/react-router";
import { CheckinPage } from "../../../surfaces/app/member/CheckinPage";

export const Route = createFileRoute("/a/_m/checkin")({ component: CheckinPage });
