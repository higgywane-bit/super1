/** The outbox worker. Filled in by phase 1 (invite emails via Resend). */
export async function runOutbox(): Promise<{ sent: number; failed: number }> {
  return { sent: 0, failed: 0 };
}
