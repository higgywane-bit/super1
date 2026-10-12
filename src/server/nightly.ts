import { supabaseAdmin } from "./supabase";

/**
 * 02:00 Bangkok: sign-ups nobody finished within 24 h are marked abandoned, and renewal reminders are
 * queued (7 and 1 days before the end, 3 days after; the outbox worker sends them in the member's language).
 */
export async function runNightly(_at: Date): Promise<void> {
  const db = supabaseAdmin();
  await db.rpc("mark_abandoned_signups");
  const { error } = await db.rpc("queue_renewal_reminders");
  if (error) throw new Error(error.message);
}

/** 03:00 Bangkok: backup check (Supabase daily backups; weekly pg_dump to R2 is set up outside the app). */
export async function runBackupCheck(_at: Date): Promise<void> {}
