import { supabaseAdmin } from "./supabase";

/** 02:00 Bangkok: sign-ups nobody finished within 24 h are marked abandoned. Renewal reminders: phase 6. */
export async function runNightly(_at: Date): Promise<void> {
  const db = supabaseAdmin();
  await db.rpc("mark_abandoned_signups");
}

/** 03:00 Bangkok: backup check (Supabase daily backups; weekly pg_dump to R2 is set up outside the app). */
export async function runBackupCheck(_at: Date): Promise<void> {}
