import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Lang } from "../../i18n";
import { JoinLanguage } from "../../surfaces/app/join/JoinLanguage";

export const Route = createFileRoute("/a/join")({
  head: () => ({ meta: [{ title: "Superfit · Join" }] }),
  component: Join,
});

function Join() {
  const [, setPicked] = useState<Lang | null>(null);
  return <JoinLanguage onPick={setPicked} />;
}
