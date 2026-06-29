/**
 * Small helpers for working with Prisma.Decimal values coming back from the DB
 * and rendering PKR. Keeps Decimal handling in one place.
 */
import { Prisma } from "@prisma/client"

export type DecimalLike = Prisma.Decimal | number | string | null | undefined

/** Convert a Decimal/number/string to a JS number (for arithmetic + charts). */
export function toNum(v: DecimalLike): number {
  if (v == null) return 0
  if (typeof v === "number") return v
  if (typeof v === "string") return parseFloat(v) || 0
  // Prisma.Decimal
  return Number(v.toString())
}

/** Render PKR. Whole rupees by default; pass dp=2 for unit costs. */
export function pkr(v: DecimalLike, dp = 0): string {
  const n = toNum(v)
  return "Rs " + n.toLocaleString("en-PK", { minimumFractionDigits: dp, maximumFractionDigits: dp })
}

export function qtyFmt(v: DecimalLike, dp = 3): string {
  const n = toNum(v)
  // strip trailing zeros for readability
  return n.toLocaleString("en-PK", { maximumFractionDigits: dp })
}
