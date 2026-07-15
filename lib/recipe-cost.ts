import { convert, UomConversionError } from "./uom"

export type CostingProductKind = "RAW_MATERIAL" | "PACKAGING" | "RESALE" | "SUPPLIES" | "SEMI_FINISHED"
export type CostingRecipeKind = "SEMI_FINISHED" | "MENU"
export type CostingLineKind = "PRODUCT" | "COST_ADJUSTMENT"

export interface CostingProduct {
  id: string
  name: string
  kind: CostingProductKind
  stockUomCode: string | null
  avgCost: number | null
  costIsEstimated?: boolean
  productUoms?: Record<string, number>
}

export interface CostingLine {
  id: string
  kind: CostingLineKind
  productId: string | null
  label: string | null
  quantity: number
  uomCode: string | null
  fixedUnitCost: number | null
  sortOrder: number
}

export interface CostingRecipe {
  id: string
  name: string
  kind: CostingRecipeKind
  version: number
  outputProductId: string | null
  outputQty: number
  outputUomCode: string
  referenceSellPrice: number | null
  targetFoodCostPct: number
  lines: CostingLine[]
}

export interface CostingGraph {
  products: Map<string, CostingProduct>
  recipes: Map<string, CostingRecipe>
  recipeByOutputProduct: Map<string, string>
}

export interface CostFlag {
  code: "CYCLE" | "MISSING_PRODUCT" | "MISSING_PRICE" | "MISSING_RECIPE" | "INVALID_QTY" | "UOM_MISMATCH" | "INVALID_OUTPUT"
  message: string
  path: string[]
}

export interface CostedLine {
  id: string
  label: string
  quantity: number
  uomCode: string | null
  quantityInStockUom: number | null
  unitCost: number | null
  lineCost: number
  source: "product" | "semi" | "adjustment" | "error"
  flags: CostFlag[]
}

export interface RecipeCostResult {
  recipeId: string
  recipeName: string
  version: number
  totalCost: number
  costPerOutputUnit: number | null
  outputQty: number
  outputUomCode: string
  referenceSellPrice: number | null
  foodCostPct: number | null
  margin: number | null
  suggestedSellPrice: number | null
  lines: CostedLine[]
  flags: CostFlag[]
}

export interface ExplodedIngredient {
  productId: string
  name: string
  kind: CostingProductKind
  quantity: number
  uomCode: string
  unitCost: number | null
  totalCost: number
  costIsEstimated: boolean
}

export interface RecipeExplosion {
  ingredients: ExplodedIngredient[]
  adjustmentCost: number
  totalCost: number
  flags: CostFlag[]
}

function flag(code: CostFlag["code"], message: string, path: string[]): CostFlag {
  return { code, message, path }
}

function toStockQty(product: CostingProduct, qty: number, fromUom: string | null): number {
  if (!product.stockUomCode || !fromUom) throw new UomConversionError(fromUom ?? "(missing)", product.stockUomCode ?? "(missing)")
  return convert(qty, fromUom, product.stockUomCode, {
    productUoms: product.productUoms,
    stockUomCode: product.stockUomCode,
  })
}

/** Cost one active immutable recipe version, recursively resolving semi-finished products. */
export function costRecipe(recipeId: string, graph: CostingGraph): RecipeCostResult {
  const memo = new Map<string, RecipeCostResult>()

  function run(id: string, stack: string[]): RecipeCostResult {
    const cached = memo.get(id)
    if (cached) return cached
    const recipe = graph.recipes.get(id)
    if (!recipe) {
      const f = flag("MISSING_RECIPE", `Recipe ${id} was not found.`, stack)
      return emptyResult(id, "Missing recipe", f)
    }
    if (stack.includes(id)) {
      const names = [...stack, id].map((x) => graph.recipes.get(x)?.name ?? x)
      const f = flag("CYCLE", `Recipe cycle detected: ${names.join(" → ")}.`, names)
      return emptyResult(id, recipe.name, f, recipe)
    }

    const path = [...stack, id]
    const costedLines: CostedLine[] = []
    const allFlags: CostFlag[] = []
    let total = 0

    for (const line of [...recipe.lines].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const lineFlags: CostFlag[] = []
      const pathNames = path.map((x) => graph.recipes.get(x)?.name ?? x)
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        lineFlags.push(flag("INVALID_QTY", `Line quantity must be greater than zero.`, pathNames))
      }

      if (line.kind === "COST_ADJUSTMENT") {
        const unitCost = line.fixedUnitCost
        if (unitCost == null || !Number.isFinite(unitCost)) {
          lineFlags.push(flag("MISSING_PRICE", `${line.label ?? "Cost adjustment"} has no cost.`, pathNames))
        }
        const lineCost = unitCost == null ? 0 : Math.max(0, line.quantity) * unitCost
        total += lineCost
        allFlags.push(...lineFlags)
        costedLines.push({
          id: line.id,
          label: line.label ?? "Cost adjustment",
          quantity: line.quantity,
          uomCode: line.uomCode,
          quantityInStockUom: null,
          unitCost,
          lineCost,
          source: lineFlags.length ? "error" : "adjustment",
          flags: lineFlags,
        })
        continue
      }

      const product = line.productId ? graph.products.get(line.productId) : null
      if (!product) {
        lineFlags.push(flag("MISSING_PRODUCT", `${line.label ?? "Recipe line"} has no valid product.`, pathNames))
        allFlags.push(...lineFlags)
        costedLines.push({ id: line.id, label: line.label ?? "Missing product", quantity: line.quantity, uomCode: line.uomCode, quantityInStockUom: null, unitCost: null, lineCost: 0, source: "error", flags: lineFlags })
        continue
      }

      let stockQty: number | null = null
      try {
        stockQty = toStockQty(product, line.quantity, line.uomCode)
      } catch (e) {
        lineFlags.push(flag("UOM_MISMATCH", e instanceof Error ? e.message : `Cannot convert ${line.uomCode} to ${product.stockUomCode}.`, [...pathNames, product.name]))
      }

      let unitCost: number | null = product.avgCost
      let source: CostedLine["source"] = "product"
      if (product.kind === "SEMI_FINISHED") {
        source = "semi"
        const subId = graph.recipeByOutputProduct.get(product.id)
        if (!subId) {
          unitCost = null
          lineFlags.push(flag("MISSING_RECIPE", `${product.name} has no active production recipe.`, [...pathNames, product.name]))
        } else {
          const sub = run(subId, path)
          allFlags.push(...sub.flags)
          try {
            const outputInStock = toStockQty(product, sub.outputQty, sub.outputUomCode)
            if (outputInStock <= 0) throw new Error(`${product.name} output must be greater than zero.`)
            unitCost = sub.totalCost / outputInStock
          } catch (e) {
            unitCost = null
            lineFlags.push(flag("INVALID_OUTPUT", e instanceof Error ? e.message : `${product.name} has invalid output.`, [...pathNames, product.name]))
          }
        }
      } else if (unitCost == null) {
        lineFlags.push(flag("MISSING_PRICE", `${product.name} has no current unit cost.`, [...pathNames, product.name]))
      }

      const lineCost = stockQty == null || unitCost == null ? 0 : stockQty * unitCost
      total += lineCost
      allFlags.push(...lineFlags)
      costedLines.push({
        id: line.id,
        label: product.name,
        quantity: line.quantity,
        uomCode: line.uomCode,
        quantityInStockUom: stockQty,
        unitCost,
        lineCost,
        source: lineFlags.length ? "error" : source,
        flags: lineFlags,
      })
    }

    if (!Number.isFinite(recipe.outputQty) || recipe.outputQty <= 0) {
      allFlags.push(flag("INVALID_OUTPUT", `${recipe.name} output quantity must be greater than zero.`, [recipe.name]))
    }
    const costPerOutputUnit = recipe.outputQty > 0 ? total / recipe.outputQty : null
    const sell = recipe.referenceSellPrice
    const result: RecipeCostResult = {
      recipeId: recipe.id,
      recipeName: recipe.name,
      version: recipe.version,
      totalCost: total,
      costPerOutputUnit,
      outputQty: recipe.outputQty,
      outputUomCode: recipe.outputUomCode,
      referenceSellPrice: sell,
      foodCostPct: sell != null && sell > 0 ? total / sell : null,
      margin: sell != null ? sell - total : null,
      suggestedSellPrice: recipe.targetFoodCostPct > 0 ? total / recipe.targetFoodCostPct : null,
      lines: costedLines,
      flags: dedupeFlags(allFlags),
    }
    memo.set(id, result)
    return result
  }

  return run(recipeId, [])
}

/** Expand a desired amount of recipe output into raw/packaging usage in stock units. */
export function explodeRecipe(recipeId: string, outputUnits: number, graph: CostingGraph): RecipeExplosion {
  const totals = new Map<string, ExplodedIngredient>()
  const flags: CostFlag[] = []
  let adjustmentCost = 0

  function walkBatches(id: string, batches: number, stack: string[]) {
    const recipe = graph.recipes.get(id)
    if (!recipe) {
      flags.push(flag("MISSING_RECIPE", `Recipe ${id} was not found.`, stack))
      return
    }
    if (stack.includes(id)) {
      const names = [...stack, id].map((x) => graph.recipes.get(x)?.name ?? x)
      flags.push(flag("CYCLE", `Recipe cycle detected: ${names.join(" → ")}.`, names))
      return
    }
    const path = [...stack, id]

    for (const line of recipe.lines) {
      if (line.kind === "COST_ADJUSTMENT") {
        if (line.fixedUnitCost == null) flags.push(flag("MISSING_PRICE", `${line.label ?? "Cost adjustment"} has no cost.`, [recipe.name]))
        else adjustmentCost += line.quantity * line.fixedUnitCost * batches
        continue
      }
      const product = line.productId ? graph.products.get(line.productId) : null
      if (!product) {
        flags.push(flag("MISSING_PRODUCT", `${line.label ?? "Recipe line"} has no valid product.`, [recipe.name]))
        continue
      }
      let qty: number
      try {
        qty = toStockQty(product, line.quantity * batches, line.uomCode)
      } catch (e) {
        flags.push(flag("UOM_MISMATCH", e instanceof Error ? e.message : `Cannot convert line quantity.`, [recipe.name, product.name]))
        continue
      }

      if (product.kind === "SEMI_FINISHED") {
        const subId = graph.recipeByOutputProduct.get(product.id)
        const sub = subId ? graph.recipes.get(subId) : null
        if (!subId || !sub) {
          flags.push(flag("MISSING_RECIPE", `${product.name} has no active production recipe.`, [recipe.name, product.name]))
          continue
        }
        try {
          const subOutput = toStockQty(product, sub.outputQty, sub.outputUomCode)
          if (subOutput <= 0) throw new Error(`${product.name} output must be greater than zero.`)
          walkBatches(subId, qty / subOutput, path)
        } catch (e) {
          flags.push(flag("INVALID_OUTPUT", e instanceof Error ? e.message : `${product.name} has invalid output.`, [recipe.name, product.name]))
        }
        continue
      }

      const existing = totals.get(product.id)
      if (existing) {
        existing.quantity += qty
        existing.totalCost = existing.unitCost == null ? 0 : existing.quantity * existing.unitCost
      } else {
        totals.set(product.id, {
          productId: product.id,
          name: product.name,
          kind: product.kind,
          quantity: qty,
          uomCode: product.stockUomCode ?? line.uomCode ?? "",
          unitCost: product.avgCost,
          totalCost: product.avgCost == null ? 0 : qty * product.avgCost,
          costIsEstimated: !!product.costIsEstimated,
        })
      }
      if (product.avgCost == null) flags.push(flag("MISSING_PRICE", `${product.name} has no current unit cost.`, [recipe.name, product.name]))
    }
  }

  const root = graph.recipes.get(recipeId)
  if (!root || root.outputQty <= 0) {
    flags.push(flag("INVALID_OUTPUT", root ? `${root.name} output quantity must be greater than zero.` : `Recipe ${recipeId} was not found.`, []))
  } else {
    walkBatches(recipeId, outputUnits / root.outputQty, [])
  }

  const ingredients = [...totals.values()].sort((a, b) => b.totalCost - a.totalCost || a.name.localeCompare(b.name))
  return {
    ingredients,
    adjustmentCost,
    totalCost: ingredients.reduce((sum, row) => sum + row.totalCost, 0) + adjustmentCost,
    flags: dedupeFlags(flags),
  }
}

function dedupeFlags(flags: CostFlag[]): CostFlag[] {
  const seen = new Set<string>()
  return flags.filter((f) => {
    const key = `${f.code}:${f.message}:${f.path.join("/")}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function emptyResult(id: string, name: string, f: CostFlag, recipe?: CostingRecipe): RecipeCostResult {
  return {
    recipeId: id,
    recipeName: name,
    version: recipe?.version ?? 0,
    totalCost: 0,
    costPerOutputUnit: null,
    outputQty: recipe?.outputQty ?? 0,
    outputUomCode: recipe?.outputUomCode ?? "",
    referenceSellPrice: recipe?.referenceSellPrice ?? null,
    foodCostPct: null,
    margin: null,
    suggestedSellPrice: null,
    lines: [],
    flags: [f],
  }
}
