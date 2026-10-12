import { createFileRoute } from "@tanstack/react-router";
import { TrainPage } from "../../../surfaces/app/member/TrainPage";

export const Route = createFileRoute("/a/_m/train")({ component: TrainPage });
