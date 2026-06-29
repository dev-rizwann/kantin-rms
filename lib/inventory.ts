import "server-only"
import { prisma } from "./prisma"
import { toNum } from "./money"

/**
 * Read helpers for the inventory pages. Kept simple (few queries each) to avoid
 * the multi-query RSC hang seen on the old /h8 overview.
 */

export interface StockOnHandRow {
  productId: string
  name: string
  kind: string
  stockUomCode: string | null
  onHand: number
  minStock: number
  avgCost: number | null
  lastMovementAt: string | null
}

/** Current on-hand for every product in a kantin, joined to the ledger view. */
export async function getStockOnHand(kantinSlug: string): Promise<StockOnHandRow[]> {
  const rows = await prisma.$queryRaw<
    {
      product_id: string
      name: string
      kind: string
      stock_uom_code: string | null
      min_stock: any
      avg_cost: any
      on_hand: any
      last_movement_at: Date | null
    }[]
  >`
    SELECT
      p.id            AS product_id,
      p.name          AS name,
      p.kind::text    AS kind,
      p."stockUomCode" AS stock_uom_code,
      p."minStock"    AS min_stock,
      p."avgCost"     AS avg_cost,
      COALESCE(soh.qty_on_hand, 0) AS on_hand,
      soh.last_movement_at         AS last_movement_at
    FROM "Product" p
    LEFT JOIN v_stock_on_hand soh
      ON soh.product_id = p.id AND soh.kantin_slug = p."kantinSlug"
    WHERE p."kantinSlug" = ${kantinSlug} AND p."isActive" = true
    ORDER BY p.name
  `
  return rows.map((r) => ({
    productId: r.product_id,
    name: r.name,
    kind: r.kind,
    stockUomCode: r.stock_uom_code,
    onHand: toNum(r.on_hand),
    minStock: toNum(r.min_stock),
    avgCost: r.avg_cost == null ? null : toNum(r.avg_cost),
    lastMovementAt: r.last_movement_at ? r.last_movement_at.toISOString() : null,
  }))
}

/** On-hand for a single product (used in the GRN confirmation + cost recompute). */
export async function getProductOnHand(kantinSlug: string, productId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ q: any }[]>`
    SELECT COALESCE(SUM(qty), 0) AS q
    FROM "StockMovement"
    WHERE "kantinSlug" = ${kantinSlug} AND "productId" = ${productId}
  `
  return toNum(rows[0]?.q)
}

export async function listVendors(kantinSlug: string) {
  return prisma.vendor.findMany({
    where: { kantinSlug },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  })
}

export async function listProducts(kantinSlug: string) {
  return prisma.product.findMany({
    where: { kantinSlug },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  })
}

export async function listActiveUoms() {
  return prisma.unitOfMeasure.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  })
}

export async function listGrns(kantinSlug: string) {
  return prisma.grn.findMany({
    where: { kantinSlug },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { vendor: true, _count: { select: { lines: true } } },
  })
}

export async function getGrn(kantinSlug: string, id: string) {
  return prisma.grn.findFirst({
    where: { id, kantinSlug },
    include: { vendor: true, lines: { include: { product: true } } },
  })
}

/** Vendor running balance = POSTED GRN grand totals − payments (lightweight udhaar). */
export async function getVendorBalance(kantinSlug: string, vendorId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ owed: any }[]>`
    SELECT
      COALESCE((SELECT SUM("grandTotal") FROM "Grn"
                WHERE "kantinSlug" = ${kantinSlug} AND "vendorId" = ${vendorId}
                  AND status = 'POSTED'), 0)
      AS owed
  `
  // payments are added in Phase 1b; balance for now = sum of posted GRNs
  return toNum(rows[0]?.owed)
}
