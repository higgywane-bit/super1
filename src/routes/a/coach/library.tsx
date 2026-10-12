import { createFileRoute } from "@tanstack/react-router";
import { LibraryPage } from "../../../surfaces/app/coach/LibraryPage";

export const Route = createFileRoute("/a/coach/library")({ component: LibraryPage });
