import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * A01 · Qashier import (docs/06-QASHIER.md). Pete uploads one or more daily Sales Report CSVs; the
 * server parses them with src/lib/qashier, shows a preview (totals, the five checks, desk vs Qashier,
 * products not in the menu, legacy categories), then imports with the service role. The browser only
 * ever sends the file text; Import parses it again on the server.
 * (Thin module: the work is in qashierCore.ts, loaded inside the handlers.)
 */
const Files = z.object({ files: z.array(z.object({ name: z.string().max(200), text: z.string().max(5_000_000) })).min(1).max(31) });
export type QashierFilesInput = z.input<typeof Files>;

export const previewQashier = createServerFn({ method: "POST" })
  .validator((d: QashierFilesInput) => Files.parse(d))
  .handler(async ({ data }) => {
    const core = await import("./qashierCore");
    await core.assertAdmin();
    return core.preview(data.files);
  });

export const importQashier = createServerFn({ method: "POST" })
  .validator((d: QashierFilesInput) => Files.parse(d))
  .handler(async ({ data }) => {
    const core = await import("./qashierCore");
    const me = await core.assertAdmin();
    return core.importFiles(data.files, me);
  });

export type { QashierPreview, QashierImportResult } from "./qashierTypes";
