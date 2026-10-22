import { createHmac, timingSafeEqual } from "node:crypto"
import { z } from "zod"
import { filterReportingSnapshot } from "./reporting-snapshot"

const PURPOSE = "kantin-muzafarabad-clean-launch-v1"
const Permit = z.object({ purpose: z.literal(PURPOSE), kantinSlug: z.literal("kashmir"), nonce: z.string().uuid(), expiresAt: z.number().int() }).strict()
export const Launch = z.object({
  mode: z.literal("activate"), permit: z.string().max(2048), instanceId: z.string().uuid(),
  cleanupId: z.string().uuid(), cleanupUtc: z.string().datetime(), backupAt: z.string().datetime(),
  computerName: z.string().regex(/^[A-Za-z0-9-]{1,63}$/),
  receiptBaseline: z.number().int().min(0).max(2147483647), tables: z.unknown(),
}).strict()
export function verifyLaunchPermit(value: string, secret: string, now = Date.now()) {
  if (secret.length < 32) throw new Error("Launch signing is not configured")
  const [payload, signature, extra] = value.split(".")
  if (!payload || !signature || extra || !/^[A-Za-z0-9_-]+$/.test(payload) || !/^[a-f0-9]{64}$/.test(signature)) throw new Error("Invalid launch permit")
  const expected = createHmac("sha256", secret).update(PURPOSE + ":" + payload).digest()
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) throw new Error("Invalid launch permit")
  const result = Permit.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")))
  if (result.expiresAt <= now || result.expiresAt > now + 8 * 86400000) throw new Error("Launch permit expired or invalid")
  return result
}
export function prepareLaunch(data: z.infer<typeof Launch>, secret: string, now = Date.now()) {
  const permit = verifyLaunchPermit(data.permit, secret, now)
  const cleanup = Date.parse(data.cleanupUtc), backup = Date.parse(data.backupAt)
  if (cleanup > now + 300000 || cleanup < now - 7 * 86400000) throw new Error("Cleanup is stale or clock is incorrect")
  if (backup < cleanup || backup < now - 2 * 3600000 || backup > now + 300000) throw new Error("Fresh post-cleanup backup required")
  // All POS timestamps are local Pakistan time; never use the web server timezone.
  const firstTradingLocal = new Date(cleanup + 5 * 3600000).toISOString().slice(0, 19)
  const raw = data.tables as Record<string, unknown>
  for (const table of ["RECEIPT", "CHECKOUT", "ITEMSALE", "PAYMENT", "CANCEL", "REFUND"]) {
    if (!raw || !Array.isArray(raw[table]) || (raw[table] as unknown[]).length) throw new Error("Launch requires no sales, payments or unpaid orders; review required")
  }
  const tables = filterReportingSnapshot(data.tables, data.receiptBaseline, firstTradingLocal)
  return { permit, firstTradingLocal, tables, backupAt: new Date(backup) }
}
