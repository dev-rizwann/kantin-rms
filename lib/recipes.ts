import "server-only"
import { Prisma } from "@prisma/client"
import { prisma } from "./prisma"
import { toNum } from "./money"
import { costRecipe, explodeRecipe, type CostingGraph, type CostingProduct, type CostingRecipe } from "./recipe-cost"
import { normalizeRecipeTitle } from "./recipe-title"

export interface LoadedCosting {
  graph: CostingGraph
  dbProducts: Awaited<ReturnType<typeof loadDbProducts>>
  dbRecipes: Awaited<ReturnType<typeof loadDbRecipes>>
}

function loadDbProducts(kantinSlug: string) {
  return prisma.product.findMany({
    where: { kantinSlug, isActive: true },
    include: { productUoms: { where: { isActive: true } } },
    orderBy: [{ costingCategory: "asc" }, { name: "asc" }],
  })
}

function loadDbRecipes(kantinSlug: string) {
  return prisma.recipe.findMany({
    where: { kantinSlug, status: { not: "ARCHIVED" } },
    include: {
      outputProduct: true,
      aliases: { orderBy: [{ isPrimary: "desc" }, { title: "asc" }] },
      oilAllocation: true,
      activeVersion: { include: { lines: { orderBy: { sortOrder: "asc" }, include: { product: true } } } },
    },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  })
}

export async function loadCosting(kantinSlug: string): Promise<LoadedCosting> {
  const [dbProducts, dbRecipes] = await Promise.all([loadDbProducts(kantinSlug), loadDbRecipes(kantinSlug)])
  const products = new Map<string, CostingProduct>()
  for (const p of dbProducts) {
    products.set(p.id, {
      id: p.id,
      name: p.name,
      kind: p.kind,
      stockUomCode: p.stockUomCode ?? p.unit,
      avgCost: p.avgCost == null ? null : toNum(p.avgCost),
      costIsEstimated: p.costIsEstimated,
      productUoms: Object.fromEntries(p.productUoms.map((u) => [u.uomCode, toNum(u.qtyInStockUom)])),
    })
  }

  const recipes = new Map<string, CostingRecipe>()
  const recipeByOutputProduct = new Map<string, string>()
  for (const r of dbRecipes) {
    const v = r.activeVersion
    if (!v) continue
    recipes.set(r.id, {
      id: r.id,
      name: r.name,
      kind: r.kind,
      version: v.version,
      outputProductId: r.outputProductId,
      outputQty: toNum(v.outputQty),
      outputUomCode: v.outputUomCode,
      referenceSellPrice: v.referenceSellPrice == null ? null : toNum(v.referenceSellPrice),
      targetFoodCostPct: toNum(v.targetFoodCostPct),
      lines: v.lines.map((line) => ({
        id: line.id,
        kind: line.kind,
        productId: line.productId,
        label: line.label,
        quantity: toNum(line.quantity),
        uomCode: line.uomCode,
        fixedUnitCost: line.fixedUnitCost == null ? null : toNum(line.fixedUnitCost),
        sortOrder: line.sortOrder,
      })),
    })
    if (r.outputProductId) recipeByOutputProduct.set(r.outputProductId, r.id)
  }
  return { graph: { products, recipes, recipeByOutputProduct }, dbProducts, dbRecipes }
}

interface PosItemRollup {
  item_id: bigint
  title: string
  category: string | null
  current_price: number
  units_sold: bigint
  sales: number
}

async function getPosRollup(kantinSlug: string, from?: string, to?: string): Promise<PosItemRollup[]> {
  const start = from ? new Date(`${from}T00:00:00+05:00`) : new Date("2000-01-01T00:00:00+05:00")
  const end = to ? new Date(`${to}T23:59:59.999+05:00`) : new Date("2100-01-01T00:00:00+05:00")
  return prisma.$queryRaw<PosItemRollup[]>(Prisma.sql`
    WITH items AS MATERIALIZED (
      SELECT i.id, i.title, i.price, c.title AS category
      FROM mp_item i
      LEFT JOIN mp_category c ON c.id=i.category_id AND c.kantin_slug=${kantinSlug}
      WHERE i.kantin_slug=${kantinSlug}
    ),
    cancels AS MATERIALIZED (
      SELECT DISTINCT itemsale_id FROM mp_cancel WHERE kantin_slug=${kantinSlug}
    ),
    refunds AS MATERIALIZED (
      SELECT DISTINCT itemsale_id FROM mp_refund WHERE kantin_slug=${kantinSlug}
    ),
    checkouts AS MATERIALIZED (
      SELECT receipt_id, bool_or(void) AS void
      FROM mp_checkout WHERE kantin_slug=${kantinSlug} GROUP BY receipt_id
    ),
    sales AS MATERIALIZED (
      SELECT s.item_id, COUNT(*) AS units_sold, COALESCE(SUM(s.price),0) AS sales
      FROM mp_itemsale s
      LEFT JOIN cancels cn ON cn.itemsale_id=s.id
      LEFT JOIN refunds rf ON rf.itemsale_id=s.id
      JOIN checkouts co ON co.receipt_id=s.receipt_id
      WHERE s.kantin_slug=${kantinSlug}
        AND s.sale_time >= ${start} AND s.sale_time <= ${end}
        AND cn.itemsale_id IS NULL AND rf.itemsale_id IS NULL AND co.void=false
      GROUP BY s.item_id
    )
    SELECT i.id AS item_id, i.title, i.category, i.price AS current_price,
           COALESCE(s.units_sold,0) AS units_sold, COALESCE(s.sales,0) AS sales
    FROM items i LEFT JOIN sales s ON s.item_id=i.id
    ORDER BY COALESCE(s.sales,0) DESC, i.title
  `)
}

async function getPosCatalog(kantinSlug: string): Promise<PosItemRollup[]> {
  return prisma.$queryRaw<PosItemRollup[]>(Prisma.sql`
    WITH items AS MATERIALIZED (
      SELECT i.id, i.title, i.price, c.title AS category
      FROM mp_item i
      LEFT JOIN mp_category c ON c.id=i.category_id AND c.kantin_slug=${kantinSlug}
      WHERE i.kantin_slug=${kantinSlug}
    )
    SELECT id AS item_id, title, category, price AS current_price,
           0::bigint AS units_sold, 0::float AS sales
    FROM items ORDER BY category NULLS LAST, title
  `)
}

function matchRecipeRows(loaded: LoadedCosting, pos: PosItemRollup[]) {
  const posById = new Map(pos.map((p) => [p.item_id.toString(), p]))
  const posByTitle = new Map(pos.map((p) => [normalizeRecipeTitle(p.title), p]))
  return loaded.dbRecipes.filter((r) => r.kind === "MENU" && r.activeVersion).map((recipe) => {
    const matched = new Map<string, PosItemRollup>()
    for (const a of recipe.aliases) {
      const row = (a.posItemId != null ? posById.get(a.posItemId.toString()) : null) ?? posByTitle.get(a.normalizedTitle)
      if (row) matched.set(row.item_id.toString(), row)
    }
    const rows = [...matched.values()]
    const primary = recipe.aliases.find((a) => a.isPrimary)
    const primaryRow = primary ? ((primary.posItemId != null ? posById.get(primary.posItemId.toString()) : null) ?? posByTitle.get(primary.normalizedTitle)) : null
    return { recipe, rows, primaryRow }
  })
}

export interface CostingDashboardRow {
  id: string
  name: string
  version: number
  plateCost: number
  sellPrice: number | null
  foodCostPct: number | null
  margin: number | null
  suggestedPrice: number | null
  unitsSold: number
  sales: number
  theoreticalCogs: number
  aliases: number
  flags: string[]
}

export async function getCostingDashboard(kantinSlug: string) {
  const [loaded, pos] = await Promise.all([loadCosting(kantinSlug), getPosRollup(kantinSlug)])
  const matched = matchRecipeRows(loaded, pos)
  const rows: CostingDashboardRow[] = matched.map(({ recipe, rows: posRows, primaryRow }) => {
    const cost = costRecipe(recipe.id, loaded.graph)
    const unitsSold = posRows.reduce((s, r) => s + Number(r.units_sold), 0)
    const sales = posRows.reduce((s, r) => s + Number(r.sales), 0)
    const sellPrice = primaryRow?.current_price ?? cost.referenceSellPrice
    return {
      id: recipe.id, name: recipe.name, version: cost.version, plateCost: cost.totalCost, sellPrice,
      foodCostPct: sellPrice != null && sellPrice > 0 ? cost.totalCost / sellPrice : null,
      margin: sellPrice == null ? null : sellPrice - cost.totalCost,
      suggestedPrice: cost.suggestedSellPrice,
      unitsSold, sales, theoreticalCogs: unitsSold * cost.totalCost,
      aliases: recipe.aliases.length, flags: cost.flags.map((f) => f.message),
    }
  }).sort((a, b) => (b.foodCostPct ?? -1) - (a.foodCostPct ?? -1))

  const costedProductIds = new Set(loaded.dbRecipes.flatMap((r) => r.activeVersion?.lines.map((l) => l.productId).filter(Boolean) ?? []))
  const ingredients = loaded.dbProducts.filter((p) => p.kind !== "SEMI_FINISHED" && p.isCostingActive)
  const totalSales = rows.reduce((s, r) => s + r.sales, 0)
  const totalCogs = rows.reduce((s, r) => s + r.theoreticalCogs, 0)
  return {
    rows,
    kpis: {
      recipes: rows.length,
      ingredients: ingredients.length,
      semis: loaded.dbRecipes.filter((r) => r.kind === "SEMI_FINISHED").length,
      missingCosts: ingredients.filter((p) => p.avgCost == null).length,
      estimatedCosts: ingredients.filter((p) => p.costIsEstimated).length,
      unusedIngredients: ingredients.filter((p) => !costedProductIds.has(p.id)).length,
      weightedFoodCostPct: totalSales > 0 ? totalCogs / totalSales : null,
      totalSales,
      totalCogs,
    },
    oil: loaded.dbRecipes.filter((r) => r.oilAllocation).map((r) => ({
      recipeId: r.id, name: r.name, unitsSold: r.oilAllocation!.unitsSold,
      friesGrams: toNum(r.oilAllocation!.friesGrams), breadedGrams: toNum(r.oilAllocation!.breadedGrams),
      soakFactor: toNum(r.oilAllocation!.soakFactor), cost: toNum(r.oilAllocation!.allocatedCostPerUnit),
      sourceTotalOilSpend: r.oilAllocation!.sourceTotalOilSpend == null ? null : toNum(r.oilAllocation!.sourceTotalOilSpend),
    })),
  }
}

export async function getCostingIngredients(kantinSlug: string) {
  const products = await loadDbProducts(kantinSlug)
  return products.filter((p) => p.kind !== "SEMI_FINISHED").map((p) => ({
    id: p.id, name: p.name, kind: p.kind, category: p.costingCategory ?? "Uncategorised", uomCode: p.stockUomCode ?? p.unit,
    packPrice: p.standardPackPrice == null ? null : toNum(p.standardPackPrice), packQty: p.standardPackQty == null ? null : toNum(p.standardPackQty),
    unitCost: p.avgCost == null ? null : toNum(p.avgCost), note: p.costingNote, estimated: p.costIsEstimated,
    costingActive: p.isCostingActive, updatedAt: p.updatedAt.toISOString(),
  }))
}

export async function getRecipeLists(kantinSlug: string) {
  const loaded = await loadCosting(kantinSlug)
  return loaded.dbRecipes.map((r) => {
    const cost = r.activeVersion ? costRecipe(r.id, loaded.graph) : null
    return {
      id: r.id, name: r.name, kind: r.kind, status: r.status, outputProduct: r.outputProduct?.name ?? null,
      version: r.activeVersion?.version ?? 0, outputQty: r.activeVersion ? toNum(r.activeVersion.outputQty) : 0,
      outputUomCode: r.activeVersion?.outputUomCode ?? "", cost: cost?.totalCost ?? 0, costPerUnit: cost?.costPerOutputUnit ?? null,
      sellPrice: r.activeVersion?.referenceSellPrice == null ? null : toNum(r.activeVersion.referenceSellPrice),
      foodCostPct: cost?.foodCostPct ?? null, flags: cost?.flags.length ?? 0,
    }
  })
}

export async function getRecipeEditorData(kantinSlug: string, recipeId?: string) {
  const [loaded, uoms, posItems] = await Promise.all([
    loadCosting(kantinSlug),
    prisma.unitOfMeasure.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    getPosCatalog(kantinSlug),
  ])
  const db = recipeId ? loaded.dbRecipes.find((r) => r.id === recipeId) : null
  const v = db?.activeVersion
  return {
    products: loaded.dbProducts.filter((p) => p.isCostingActive).map((p) => {
      const semiRecipeId = p.kind === "SEMI_FINISHED" ? loaded.graph.recipeByOutputProduct.get(p.id) : null
      const semiCost = semiRecipeId ? costRecipe(semiRecipeId, loaded.graph).costPerOutputUnit : null
      return { id: p.id, name: p.name, kind: p.kind, category: p.costingCategory ?? (p.kind === "SEMI_FINISHED" ? "Semi-finished" : "Uncategorised"), uomCode: p.stockUomCode ?? p.unit, unitCost: semiCost ?? (p.avgCost == null ? null : toNum(p.avgCost)) }
    }),
    uoms: uoms.map((u) => ({ code: u.code, name: u.name, dimension: u.dimension })),
    posItems: posItems.map((p) => ({ id: p.item_id.toString(), title: p.title, category: p.category, price: Number(p.current_price) })),
    recipe: db && v ? {
      id: db.id, name: db.name, kind: db.kind, status: db.status, outputProductId: db.outputProductId,
      outputQty: toNum(v.outputQty), outputUomCode: v.outputUomCode,
      referenceSellPrice: v.referenceSellPrice == null ? null : toNum(v.referenceSellPrice), targetFoodCostPct: toNum(v.targetFoodCostPct), notes: v.notes,
      lines: v.lines.map((l) => ({ id: l.id, kind: l.kind, productId: l.productId, label: l.label, quantity: toNum(l.quantity), uomCode: l.uomCode, fixedUnitCost: l.fixedUnitCost == null ? null : toNum(l.fixedUnitCost) })),
      aliases: db.aliases.map((a) => ({ title: a.title, posItemId: a.posItemId?.toString() ?? "", isPrimary: a.isPrimary })),
      cost: costRecipe(db.id, loaded.graph),
    } : null,
  }
}

export async function getTheoreticalUsage(kantinSlug: string, from: string, to: string) {
  const [loaded, pos] = await Promise.all([loadCosting(kantinSlug), getPosRollup(kantinSlug, from, to)])
  const matched = matchRecipeRows(loaded, pos)
  const usage = new Map<string, { productId: string; name: string; category: string; kind: string; quantity: number; uomCode: string; unitCost: number | null; totalCost: number; estimated: boolean }>()
  const recipeRows: { recipeId: string; name: string; units: number; sales: number; cogs: number; foodCostPct: number | null }[] = []
  const matchedPosIds = new Set<string>()
  let adjustmentCost = 0

  for (const { recipe, rows } of matched) {
    const units = rows.reduce((s, r) => s + Number(r.units_sold), 0)
    if (units <= 0) continue
    rows.forEach((r) => matchedPosIds.add(r.item_id.toString()))
    const sales = rows.reduce((s, r) => s + Number(r.sales), 0)
    const x = explodeRecipe(recipe.id, units, loaded.graph)
    adjustmentCost += x.adjustmentCost
    for (const item of x.ingredients) {
      const dbp = loaded.dbProducts.find((p) => p.id === item.productId)
      const old = usage.get(item.productId)
      if (old) { old.quantity += item.quantity; old.totalCost += item.totalCost }
      else usage.set(item.productId, { productId: item.productId, name: item.name, category: dbp?.costingCategory ?? "Uncategorised", kind: item.kind, quantity: item.quantity, uomCode: item.uomCode, unitCost: item.unitCost, totalCost: item.totalCost, estimated: item.costIsEstimated })
    }
    recipeRows.push({ recipeId: recipe.id, name: recipe.name, units, sales, cogs: x.totalCost, foodCostPct: sales > 0 ? x.totalCost / sales : null })
  }

  const unmapped = pos.filter((p) => Number(p.units_sold) > 0 && !matchedPosIds.has(p.item_id.toString())).map((p) => ({ itemId: p.item_id.toString(), title: p.title, category: p.category, units: Number(p.units_sold), sales: Number(p.sales) })).sort((a, b) => b.sales - a.sales)
  const ingredients = [...usage.values()].sort((a, b) => b.totalCost - a.totalCost)
  recipeRows.sort((a, b) => b.cogs - a.cogs)
  const sales = recipeRows.reduce((s, r) => s + r.sales, 0)
  const cogs = ingredients.reduce((s, r) => s + r.totalCost, 0) + adjustmentCost
  return {
    from, to, ingredients, recipes: recipeRows, unmapped,
    kpis: { mappedUnits: recipeRows.reduce((s, r) => s + r.units, 0), sales, theoreticalCogs: cogs, foodCostPct: sales > 0 ? cogs / sales : null, adjustmentCost, unmappedUnits: unmapped.reduce((s, r) => s + r.units, 0) },
  }
}
