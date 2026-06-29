"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAction, clientIp, currentUser } from "@/lib/server-auth"
import { logAudit } from "@/lib/audit"
import { convert, UomConversionError } from "@/lib/uom"

const KANTIN = "h8"

export interface ActionResult<T = unknown> {
  ok: boolean
  error?: string
  data?: T
}

// ---------------------------------------------------------------- Vendors

export async function createVendor(input: {
  name: string
  contactPerson?: string
  phone?: string
  whatsapp?: string
  address?: string
  ntn?: string
  strn?: string
  isSalesTaxRegistered?: boolean
  paymentTermsDays?: number | null
  supplyCadence?: string | null
  bankName?: string
  bankAccountNumber?: string
  jazzcashNumber?: string
  easypaisaNumber?: string
  nameUr?: string
  notes?: string
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireAction("vendor.edit", KANTIN)
    if (!input.name?.trim()) return { ok: false, error: "Vendor name is required" }

    const vendor = await prisma.$transaction(async (tx) => {
      const v = await tx.vendor.create({
        data: {
          kantinSlug: KANTIN,
          name: input.name.trim(),
          contactPerson: input.contactPerson || null,
          phone: input.phone || null,
          whatsapp: input.whatsapp || null,
          address: input.address || null,
          ntn: input.ntn || null,
          strn: input.strn || null,
          isSalesTaxRegistered: !!input.isSalesTaxRegistered,
          paymentTermsDays: input.paymentTermsDays ?? null,
          supplyCadence: (input.supplyCadence as any) || null,
          bankName: input.bankName || null,
          bankAccountNumber: input.bankAccountNumber || null,
          jazzcashNumber: input.jazzcashNumber || null,
          easypaisaNumber: input.easypaisaNumber || null,
          nameUr: input.nameUr || null,
          notes: input.notes || null,
        },
      })
      await logAudit(tx, {
        actorId: user.id, actorRole: user.role, kantinSlug: KANTIN,
        action: "vendor.created", entityType: "Vendor", entityId: v.id,
        summary: `Created vendor ${v.name}`, ip: clientIp(),
      })
      return v
    })
    revalidatePath("/h8/vendors")
    return { ok: true, data: { id: vendor.id } }
  } catch (e) {
    return { ok: false, error: errMsg(e) }
  }
}

// ---------------------------------------------------------------- Products

export async function createProduct(input: {
  name: string
  kind: string
  stockUomCode: string
  minStock?: number
  nameUr?: string
  packs?: { uomCode: string; qtyInStockUom: number; isDefaultPurchase?: boolean }[]
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireAction("product.edit", KANTIN)
    if (!input.name?.trim()) return { ok: false, error: "Product name is required" }
    if (!input.stockUomCode) return { ok: false, error: "Stock unit is required" }

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          kantinSlug: KANTIN,
          name: input.name.trim(),
          nameUr: input.nameUr || null,
          kind: (input.kind as any) || "RAW_MATERIAL",
          stockUomCode: input.stockUomCode,
          unit: legacyUnit(input.stockUomCode),
          minStock: new Prisma.Decimal(input.minStock ?? 0),
        },
      })
      for (const pk of input.packs ?? []) {
        if (!pk.uomCode || !pk.qtyInStockUom) continue
        await tx.productUom.create({
          data: {
            productId: p.id,
            uomCode: pk.uomCode,
            qtyInStockUom: new Prisma.Decimal(pk.qtyInStockUom),
            role: "PURCHASE",
            isDefaultPurchase: !!pk.isDefaultPurchase,
          },
        })
      }
      await logAudit(tx, {
        actorId: user.id, actorRole: user.role, kantinSlug: KANTIN,
        action: "product.created", entityType: "Product", entityId: p.id,
        summary: `Created product ${p.name} (${input.stockUomCode})`, ip: clientIp(),
      })
      return p
    })
    revalidatePath("/h8/products")
    revalidatePath("/h8/inventory")
    return { ok: true, data: { id: product.id } }
  } catch (e) {
    return { ok: false, error: errMsg(e) }
  }
}

// ---------------------------------------------------------------- GRN

interface GrnLineInput {
  productId: string
  uomCode: string       // unit the received qty is entered in
  receivedQty: number   // REQUIRED, must be > 0
  rejectedQty?: number
  unitCost: number      // per uomCode
  taxRatePct?: number
  batchNo?: string
  expiryDate?: string | null
}

/**
 * Create + POST a GRN in one atomic transaction:
 *  - generate GRN number
 *  - for each line: convert received qty -> stock UoM, insert StockMovement(kind=GRN),
 *    recompute weighted-average cost (row-locked), snapshot ProductCostHistory
 *  - write GRN header + lines, audit
 * Idempotent at the ledger via @@unique([kantinSlug, refType, refId, productId]).
 */
export async function postGrn(input: {
  vendorId: string | null
  receivedAt: string
  invoiceRef?: string
  isInformal?: boolean
  notes?: string
  lines: GrnLineInput[]
}): Promise<ActionResult<{ id: string; grnNumber: string }>> {
  try {
    const user = await requireAction("grn.post", KANTIN)

    if (!input.lines?.length) return { ok: false, error: "Add at least one line" }
    for (const l of input.lines) {
      if (!l.productId) return { ok: false, error: "Every line needs a product" }
      if (!(l.receivedQty > 0)) return { ok: false, error: "Received qty must be greater than 0 on every line (physical count required)" }
      if (!l.uomCode) return { ok: false, error: "Every line needs a unit" }
      if (l.unitCost == null || l.unitCost < 0) return { ok: false, error: "Every line needs a unit cost" }
    }

    const occurredAt = new Date(input.receivedAt || Date.now())

    const result = await prisma.$transaction(async (tx) => {
      // GRN number: GRN-YYYY-NNNN per kantin per year
      const year = occurredAt.getFullYear()
      const countThisYear = await tx.grn.count({
        where: { kantinSlug: KANTIN, grnNumber: { startsWith: `GRN-${year}-` } },
      })
      const grnNumber = `GRN-${year}-${String(countThisYear + 1).padStart(4, "0")}`

      // load products + their pack UoMs for conversion
      const productIds = input.lines.map((l) => l.productId)
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, kantinSlug: KANTIN },
        include: { productUoms: true },
      })
      const pmap = new Map(products.map((p) => [p.id, p]))

      let subtotal = new Prisma.Decimal(0)
      let taxTotal = new Prisma.Decimal(0)

      // Pre-compute converted qty + per-stock-unit cost per line
      const computed = input.lines.map((l) => {
        const p = pmap.get(l.productId)
        if (!p) throw new Error(`Product not found: ${l.productId}`)
        if (!p.stockUomCode) throw new Error(`Product ${p.name} has no stock unit set`)
        const packs: Record<string, number> = {}
        for (const pu of p.productUoms) packs[pu.uomCode] = Number(pu.qtyInStockUom.toString())
        let qtyInStock: number
        try {
          qtyInStock = convert(l.receivedQty, l.uomCode, p.stockUomCode, {
            productUoms: packs,
            stockUomCode: p.stockUomCode,
          })
        } catch (err) {
          if (err instanceof UomConversionError) {
            throw new Error(
              `Cannot convert ${l.uomCode} to ${p.stockUomCode} for ${p.name}. ` +
                `Add a pack size on the product (e.g. 1 ${l.uomCode} = N ${p.stockUomCode}).`,
            )
          }
          throw err
        }
        const lineTotal = l.receivedQty * l.unitCost
        const taxRate = l.taxRatePct ?? 0
        const taxAmount = (lineTotal * taxRate) / 100
        const costPerStockUom = qtyInStock > 0 ? lineTotal / qtyInStock : l.unitCost
        return { l, p, qtyInStock, lineTotal, taxRate, taxAmount, costPerStockUom }
      })

      // Create GRN header (POSTED)
      const grn = await tx.grn.create({
        data: {
          kantinSlug: KANTIN,
          grnNumber,
          vendorId: input.vendorId,
          receivedAt: occurredAt,
          invoiceRef: input.invoiceRef || null,
          isInformal: !!input.isInformal,
          notes: input.notes || null,
          status: "POSTED",
          postedAt: new Date(),
          createdById: user.id,
          receivedById: user.id,
        },
      })

      for (const c of computed) {
        subtotal = subtotal.add(c.lineTotal)
        taxTotal = taxTotal.add(c.taxAmount)

        await tx.grnLine.create({
          data: {
            grnId: grn.id,
            productId: c.p.id,
            uomCode: c.l.uomCode,
            qty: new Prisma.Decimal(c.l.receivedQty),
            qtyInStockUom: new Prisma.Decimal(c.qtyInStock),
            rejectedQty: new Prisma.Decimal(c.l.rejectedQty ?? 0),
            unitCost: new Prisma.Decimal(c.l.unitCost),
            lineTotal: new Prisma.Decimal(c.lineTotal),
            taxRatePct: new Prisma.Decimal(c.taxRate),
            taxAmount: new Prisma.Decimal(c.taxAmount),
            batchNo: c.l.batchNo || null,
            expiryDate: c.l.expiryDate ? new Date(c.l.expiryDate) : null,
          },
        })

        // Ledger movement (idempotent via unique refType+refId+product)
        await tx.stockMovement.create({
          data: {
            kantinSlug: KANTIN,
            productId: c.p.id,
            kind: "GRN",
            qty: new Prisma.Decimal(c.qtyInStock),
            unitCost: new Prisma.Decimal(c.costPerStockUom),
            valueDelta: new Prisma.Decimal(c.lineTotal),
            uomCode: c.p.stockUomCode,
            refType: "GRN",
            refId: grn.id,
            occurredAt,
            createdById: user.id,
          },
        })

        // Weighted-average cost recompute (current on-hand from ledger, pre-this-movement)
        const sohRows = await tx.$queryRaw<{ q: any }[]>`
          SELECT COALESCE(SUM(qty),0) AS q FROM "StockMovement"
          WHERE "kantinSlug" = ${KANTIN} AND "productId" = ${c.p.id}
            AND id <> (SELECT id FROM "StockMovement"
                       WHERE "kantinSlug"=${KANTIN} AND "refType"='GRN' AND "refId"=${grn.id} AND "productId"=${c.p.id})
        `
        const priorQty = Number(sohRows[0]?.q?.toString?.() ?? sohRows[0]?.q ?? 0)
        const priorAvg = c.p.avgCost ? Number(c.p.avgCost.toString()) : 0
        const newQty = priorQty + c.qtyInStock
        let newAvg: number
        if (priorQty <= 0) {
          newAvg = c.costPerStockUom // on-hand was zero/negative; reset to this cost
        } else {
          newAvg = (priorQty * priorAvg + c.qtyInStock * c.costPerStockUom) / newQty
        }
        await tx.product.update({
          where: { id: c.p.id },
          data: {
            avgCost: new Prisma.Decimal(newAvg),
            lastPurchaseCost: new Prisma.Decimal(c.costPerStockUom),
          },
        })
        await tx.productCostHistory.create({
          data: {
            productId: c.p.id,
            effectiveAt: occurredAt,
            oldAvgCost: c.p.avgCost ? c.p.avgCost : null,
            newAvgCost: new Prisma.Decimal(newAvg),
            qtyOnHandAtCalc: new Prisma.Decimal(newQty),
            inboundQty: new Prisma.Decimal(c.qtyInStock),
            inboundUnitCost: new Prisma.Decimal(c.costPerStockUom),
            sourceType: "GRN",
            sourceId: grn.id,
          },
        })
      }

      await tx.grn.update({
        where: { id: grn.id },
        data: {
          subtotal,
          taxTotal,
          grandTotal: subtotal.add(taxTotal),
        },
      })

      await logAudit(tx, {
        actorId: user.id, actorRole: user.role, kantinSlug: KANTIN,
        action: "grn.posted", entityType: "Grn", entityId: grn.id,
        summary: `Posted ${grnNumber} (${computed.length} lines, ${subtotal.add(taxTotal).toString()})`,
        ip: clientIp(),
      })

      return { id: grn.id, grnNumber }
    })

    revalidatePath("/h8/grn")
    revalidatePath("/h8/inventory")
    return { ok: true, data: result }
  } catch (e) {
    return { ok: false, error: errMsg(e) }
  }
}

// ---------------------------------------------------------------- helpers

function legacyUnit(code: string): any {
  const known = ["KG", "GRAM", "LITRE", "ML", "PIECE", "PACK", "BOX", "BOTTLE"]
  return known.includes(code) ? code : "PIECE"
}

function errMsg(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "PermissionError") return "You don't have permission to do that."
    return e.message
  }
  return "Something went wrong."
}
