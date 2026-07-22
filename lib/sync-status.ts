import "server-only"
import { prisma } from "./prisma"

export interface SyncStatus {
  /** Last time the canteen PC successfully authenticated and pushed — updated
   *  even when the push carried no new rows, so this is "last contact". */
  lastContactAt: string | null
  /** Last time rows actually landed. Behind lastContactAt during quiet hours. */
  lastRowsAt: string | null
  /** True when the lookup itself failed — distinguishes "couldn't check" from
   *  "genuinely never synced". */
  unavailable?: boolean
}

/** Never throws — this renders in the /h8 layout, so a DB hiccup here would
 *  take down every page rather than just hiding a timestamp. */
export async function getSyncStatus(kantinSlug: string): Promise<SyncStatus> {
  try {
    const [token, batch] = await Promise.all([
      prisma.syncToken.findUnique({ where: { kantinSlug }, select: { lastUsedAt: true } }),
      prisma.syncBatch.findFirst({ where: { kantinSlug }, orderBy: { receivedAt: "desc" }, select: { receivedAt: true } }),
    ])
    return {
      lastContactAt: token?.lastUsedAt?.toISOString() ?? null,
      lastRowsAt: batch?.receivedAt?.toISOString() ?? null,
    }
  } catch {
    return { lastContactAt: null, lastRowsAt: null, unavailable: true }
  }
}
