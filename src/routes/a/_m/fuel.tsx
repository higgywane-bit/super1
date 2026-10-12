import { createFileRoute } from "@tanstack/react-router";
import { FuelPage } from "../../../surfaces/app/member/FuelPage";

export const Route = createFileRoute("/a/_m/fuel")({ component: FuelPage });
