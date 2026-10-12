import { createFileRoute } from "@tanstack/react-router";
import { JoinFlow } from "../../surfaces/app/join/JoinFlow";

export const Route = createFileRoute("/a/join")({
  head: () => ({ meta: [{ title: "Superfit · Join" }] }),
  component: JoinFlow,
});
