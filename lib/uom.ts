/**
 * Unit-of-Measure system for Kantin RMS.
 *
 * Two conversion layers:
 *  1. Dimension-level (universal physics): kg<->g, l<->ml, dozen=12 piece.
 *     Encoded as ratioToBase on each UnitOfMeasure.
 *  2. Product-specific packs: 1 BORI rice = 25 kg, 1 BOX = 24 bottles, 1 bun = 55 g.
 *     These live in ProductUom.qtyInStockUom and bridge ACROSS dimensions
 *     (e.g. a COUNT unit "bun" -> MASS grams).
 *
 * Rule: cross-dimension conversion is ONLY allowed via a ProductUom bridge.
 * Pure dimension conversion stays within one dimension.
 */

export type UomDimension = "MASS" | "VOLUME" | "COUNT"

export interface UomSeed {
  code: string
  name: string
  nameUr?: string
  dimension: UomDimension
  isBaseForDimension: boolean
  ratioToBase: number // base units in one of this unit
  sortOrder: number
}

/** Canonical seed: base units are GRAM (mass), ML (volume), PIECE (count). */
export const UOM_SEED: UomSeed[] = [
  // MASS (base = GRAM)
  { code: "GRAM", name: "Gram", nameUr: "گرام", dimension: "MASS", isBaseForDimension: true, ratioToBase: 1, sortOrder: 10 },
  { code: "KG", name: "Kilogram", nameUr: "کلو", dimension: "MASS", isBaseForDimension: false, ratioToBase: 1000, sortOrder: 11 },
  { code: "MAUND", name: "Maund (~37.32 kg)", nameUr: "من", dimension: "MASS", isBaseForDimension: false, ratioToBase: 37324, sortOrder: 12 },
  { code: "BORI", name: "Bori / Sack (default 25 kg — override per product)", nameUr: "بوری", dimension: "MASS", isBaseForDimension: false, ratioToBase: 25000, sortOrder: 13 },
  // VOLUME (base = ML)
  { code: "ML", name: "Millilitre", nameUr: "ملی لیٹر", dimension: "VOLUME", isBaseForDimension: true, ratioToBase: 1, sortOrder: 20 },
  { code: "LITRE", name: "Litre", nameUr: "لیٹر", dimension: "VOLUME", isBaseForDimension: false, ratioToBase: 1000, sortOrder: 21 },
  // COUNT (base = PIECE)
  { code: "PIECE", name: "Piece", nameUr: "عدد", dimension: "COUNT", isBaseForDimension: true, ratioToBase: 1, sortOrder: 30 },
  { code: "DOZEN", name: "Dozen", nameUr: "درجن", dimension: "COUNT", isBaseForDimension: false, ratioToBase: 12, sortOrder: 31 },
  { code: "PACK", name: "Pack (product-specific size)", dimension: "COUNT", isBaseForDimension: false, ratioToBase: 1, sortOrder: 32 },
  { code: "PACKET", name: "Packet (product-specific size)", nameUr: "پیکٹ", dimension: "COUNT", isBaseForDimension: false, ratioToBase: 1, sortOrder: 33 },
  { code: "BOX", name: "Box (product-specific size)", nameUr: "ڈبہ", dimension: "COUNT", isBaseForDimension: false, ratioToBase: 1, sortOrder: 34 },
  { code: "CARTON", name: "Carton (product-specific size)", dimension: "COUNT", isBaseForDimension: false, ratioToBase: 1, sortOrder: 35 },
  { code: "CRATE", name: "Crate (product-specific size)", dimension: "COUNT", isBaseForDimension: false, ratioToBase: 1, sortOrder: 36 },
  { code: "TRAY", name: "Tray (product-specific size)", dimension: "COUNT", isBaseForDimension: false, ratioToBase: 1, sortOrder: 37 },
  { code: "BOTTLE", name: "Bottle (product-specific size)", nameUr: "بوتل", dimension: "COUNT", isBaseForDimension: false, ratioToBase: 1, sortOrder: 38 },
  { code: "CAN", name: "Can / Tin (product-specific size)", nameUr: "ٹن", dimension: "COUNT", isBaseForDimension: false, ratioToBase: 1, sortOrder: 39 },
  { code: "TIN", name: "Tin (product-specific size)", dimension: "COUNT", isBaseForDimension: false, ratioToBase: 1, sortOrder: 40 },
]

/** Maps the legacy StockUnit enum value to the UoM code (1:1). */
export function stockUnitToUomCode(unit: string): string {
  return unit.toUpperCase()
}

const SEED_BY_CODE = new Map(UOM_SEED.map((u) => [u.code, u]))

export interface ConvertOpts {
  /** Product-specific pack sizes: uomCode -> how many STOCK-UoM units in one of it. */
  productUoms?: Record<string, number>
  /** The product's stock UoM code (target for product-specific conversions). */
  stockUomCode?: string
}

/**
 * Convert `qty` from `fromCode` to `toCode`.
 *
 * Resolution order:
 *  1. Same code -> qty unchanged.
 *  2. Both are catalog units in the SAME dimension -> ratioToBase math.
 *  3. A ProductUom bridge exists for `fromCode` (qty of stock units per fromCode)
 *     and `toCode` is the product's stock UoM (or convertible to it within a dimension).
 *
 * Throws if no path exists — callers MUST catch and block the operation
 * (GRN post / recipe save) rather than silently mis-deduct.
 */
export function convert(qty: number, fromCode: string, toCode: string, opts: ConvertOpts = {}): number {
  if (fromCode === toCode) return qty

  const from = SEED_BY_CODE.get(fromCode)
  const to = SEED_BY_CODE.get(toCode)
  const packs = opts.productUoms ?? {}

  // 1. product-specific bridge takes PRECEDENCE: pack units (BOX, BOTTLE, BORI...)
  //    carry a ratioToBase of 1 in the catalog, so their real size only exists
  //    in ProductUom. If a bridge is defined for fromCode, use it first.
  if (packs[fromCode] != null) {
    const inStockUom = qty * packs[fromCode]
    const stock = opts.stockUomCode
    if (stock && stock === toCode) return inStockUom
    if (stock) {
      const s = SEED_BY_CODE.get(stock)
      if (s && to && s.dimension === to.dimension) {
        return (inStockUom * s.ratioToBase) / to.ratioToBase
      }
    }
    // bridge existed but target wasn't reachable — fall through to dimension math
  }

  // 2. dimension-level conversion (kg<->g, l<->ml, dozen<->piece)
  if (from && to && from.dimension === to.dimension) {
    const inBase = qty * from.ratioToBase
    return inBase / to.ratioToBase
  }

  throw new UomConversionError(fromCode, toCode)
}

export class UomConversionError extends Error {
  constructor(public fromCode: string, public toCode: string) {
    super(`No UoM conversion path from ${fromCode} to ${toCode}. Define a ProductUom pack size if these are different dimensions.`)
    this.name = "UomConversionError"
  }
}

export function uomDimension(code: string): UomDimension | null {
  return SEED_BY_CODE.get(code)?.dimension ?? null
}

/**
 * A COUNT unit whose real size only exists in ProductUom (BOX, PACK, TIN, CRATE…).
 * Its catalog ratioToBase is 1, so dimension math silently treats 1 BOX as
 * 1 PIECE. Anything that changes a product's stock unit must refuse these
 * while recipe lines are recorded in a different code.
 */
export function isAmbiguousPackUnit(code: string): boolean {
  const u = SEED_BY_CODE.get(code)
  return !!u && u.dimension === "COUNT" && u.ratioToBase === 1 && code !== "PIECE"
}

export interface StockUomChange { ok: boolean; reason?: string; factor?: number }

/**
 * Can a product's STOCK unit move from -> to, given how many recipe lines
 * reference it and in which unit codes?
 *
 * `factor` is how many `to` units make up one `from` unit — multiply the pack
 * quantity by it to keep the unit cost unchanged (1000 GRAM -> 1 KG).
 */
export function checkStockUomChange(from: string, to: string, lineUomCodes: readonly string[] = []): StockUomChange {
  if (from === to) return { ok: true, factor: 1 }
  const a = SEED_BY_CODE.get(from), b = SEED_BY_CODE.get(to)
  if (!b) return { ok: false, reason: `${to} is not a known unit.` }

  const inUse = lineUomCodes.filter((c) => c !== to)
  // Nothing downstream depends on the old unit — any redefinition is safe.
  if (inUse.length === 0) return { ok: true, factor: a && b.dimension === a.dimension ? a.ratioToBase / b.ratioToBase : undefined }

  if (!a || a.dimension !== b.dimension) {
    return { ok: false, reason: `${from} and ${to} measure different things, and ${inUse.length} recipe line${inUse.length === 1 ? " still records" : "s still record"} this ingredient in ${[...new Set(inUse)].join(", ")}. Change those lines first.` }
  }
  if (isAmbiguousPackUnit(to) || isAmbiguousPackUnit(from)) {
    return { ok: false, reason: `${isAmbiguousPackUnit(to) ? to : from} has no fixed size — it needs a per-product pack definition before recipe lines can convert to it.` }
  }
  return { ok: true, factor: a.ratioToBase / b.ratioToBase }
}

/** Whether a conversion path exists (for save-time validation without throwing). */
export function canConvert(fromCode: string, toCode: string, opts: ConvertOpts = {}): boolean {
  try {
    convert(1, fromCode, toCode, opts)
    return true
  } catch {
    return false
  }
}
