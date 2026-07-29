import "server-only"
import { prisma } from "./prisma"

export interface SyncStatus {
  /** Last time the canteen PC successfully authenticated and pushed — updated
   *  even when the push carried no new rows, so this is "last contact". */
  lastContactAt: string | null
  /** Last time rows actually landed. Behind lastContactAt during quiet hours. */
  lastRowsAt: string | null
  /** Newest POS ticket we hold. This is a NAIVE local (PKT) wall-clock from
   *  MutfakPos, not an instant — never timezone-convert it. Compare against
   *  lastContactAt to see whether a sync is landing but carrying no sales. */
  lastTicketAt: string | null
  /** True when the lookup itself failed — distinguishes "couldn't check" from
   *  "genuinely never synced". */
  unavailable?: boolean
}

/** Never throws — this renders in the /h8 layout, so a DB hiccup here would
 *  take down every page rather than just hiding a timestamp. */
export async function getSyncStatus(kantinSlug: string): Promise<SyncStatus> {
  try {
    const [token, batch, ticket] = await Promise.all([
      prisma.syncToken.findUnique({ where: { kantinSlug }, select: { lastUsedAt: true } }),
      prisma.syncBatch.findFirst({ where: { kantinSlug }, orderBy: { receivedAt: "desc" }, select: { receivedAt: true } }),
      prisma.$queryRaw<{ t: Date | null }[]>`SELECT MAX(created) AS t FROM mp_checkout WHERE kantin_slug=${kantinSlug}`,
    ])
    return {
      lastContactAt: token?.lastUsedAt?.toISOString() ?? null,
      lastRowsAt: batch?.receivedAt?.toISOString() ?? null,
      lastTicketAt: ticket?.[0]?.t ? ticket[0].t.toISOString() : null,
    }
  } catch {
    return { lastContactAt: null, lastRowsAt: null, lastTicketAt: null, unavailable: true }
  }
}
