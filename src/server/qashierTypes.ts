import type { QashierDay } from "../lib/qashier/parse";
import type { ReconRow } from "../lib/qashier/reconcile";

export type QashierPreview = {
  fileName: string;
  ok: boolean;
  error?: string;
  sha256?: string;
  day?: Omit<QashierDay, "products" | "modifiers" | "tabs"> & { productCount: number; modifierCount: number };
  /** "new" | "already" (same file) | "replace" (another version of this day exists) */
  state?: "new" | "already" | "replace";
  existingVersion?: number;
  recon?: ReconRow[];
  notInMenu?: { name: string; category: string; qty: number; till: number; price: number }[];
  legacyCategories?: string[];
  unmatchedStaff?: string[];
};

export type QashierImportResult = { fileName: string; status: "imported" | "replaced" | "already" | "error"; businessDate?: string; version?: number; error?: string };
