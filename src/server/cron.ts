/**
 * Scheduled jobs (Cloudflare Cron Triggers, docs/10-DEPLOY.md):
 *   * * * * *   send pending outbox rows
 *   0 19 * * *  02:00 Bangkok: renewal reminders, abandoned sign-ups
 *   0 20 * * *  03:00 Bangkok: backup check
 * Each job is idempotent: a run that overlaps another never sends anything twice.
 */
export async function runScheduled(cron: string, at: Date): Promise<void> {
  const { runOutbox } = await import("./outbox");
  if (cron === "0 19 * * *") {
    const { runNightly } = await import("./nightly");
    await runNightly(at);
  } else if (cron === "0 20 * * *") {
    const { runBackupCheck } = await import("./nightly");
    await runBackupCheck(at);
  }
  await runOutbox();
}
