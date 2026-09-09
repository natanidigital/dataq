import { prisma } from "@/lib/prisma";

/** UTC "YYYY-MM" bucket — a new key each calendar month is what makes the
 * ledger "reset" automatically: the first write in a new month starts a
 * fresh row at 0 via upsert, with no cron job needed. */
export function currentPeriodKey(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Records real bandwidth against the current month's ledger. Deliberately
 * independent of any Image row — deleting an image must not erase bandwidth
 * that was already served for it. */
export async function recordBandwidth(bytes: number): Promise<void> {
  const periodKey = currentPeriodKey();
  await prisma.bandwidthUsage.upsert({
    where: { periodKey },
    create: { periodKey, bytesServed: BigInt(bytes) },
    update: { bytesServed: { increment: BigInt(bytes) } },
  });
}

/** Current month's total bytes served. Returns 0 if nothing has been
 * recorded yet this month (no row exists until the first view). */
export async function getCurrentBandwidthServed(): Promise<number> {
  const usage = await prisma.bandwidthUsage.findUnique({ where: { periodKey: currentPeriodKey() } });
  return usage ? Number(usage.bytesServed) : 0;
}
