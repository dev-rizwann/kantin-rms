"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { clientIp, requireAction } from "@/lib/server-auth"
import { logAudit } from "@/lib/audit"
import { normalizeRecipeTitle } from "@/lib/recipe-title"
import { convert } from "@/lib/uom"

const KANTIN = "h8"
export interface ActionResult<T = unknown> { ok: boolean; error?: string; data?: T }

const ingredientSchema = z.object({
  id: z.string().min(1),
  category: z.string().trim().min(1),
  packPrice: z.number().positive(),
  packQty: z.number().positive(),
  note: z.string().trim().max(1000).optional(),
  estimated: z.boolean(),
  costingActive: z.boolean(),
})

export async function saveCostingIngredient(input: z.input<typeof ingredientSchema>): Promise<ActionResult> {
  try {
    const user = await requireAction("product.override", KANTIN)
    const data = ingredientSchema.parse(input)
    const unitCost = new Prisma.Decimal(data.packPrice).div(data.packQty)
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: data.id, kantinSlug: KANTIN } })
      if (!product) throw new Error("Ingredient not found.")
      if (product.kind === "SEMI_FINISHED") throw new Error("Semi-finished costs come from their production recipe.")
      await tx.product.update({ where: { id: product.id }, data: {
        costingCategory: data.category,
        standardPackPrice: data.packPrice,
        standardPackQty: data.packQty,
        costingNote: data.note || null,
        notes: data.note || product.notes,
        costIsEstimated: data.estimated,
        isCostingActive: data.costingActive,
        avgCost: unitCost,
        lastPurchaseCost: unitCost,
      } })
      if (product.avgCost == null || !new Prisma.Decimal(product.avgCost).equals(unitCost)) {
        await tx.productCostHistory.create({ data: {
          productId: product.id, effectiveAt: new Date(), oldAvgCost: product.avgCost, newAvgCost: unitCost,
          qtyOnHandAtCalc: 0, inboundQty: 0, inboundUnitCost: unitCost, sourceType: "COST_OVERRIDE", sourceId: null,
        } })
      }
      await logAudit(tx, {
        actorId: user.id, actorRole: user.role, kantinSlug: KANTIN, action: "product.cost_updated",
        entityType: "Product", entityId: product.id, summary: `Updated costing for ${product.name} to ${unitCost.toFixed(6)} per ${product.stockUomCode ?? product.unit}`,
        metadata: { packPrice: data.packPrice, packQty: data.packQty, estimated: data.estimated }, ip: clientIp(),
      })
    })
    revalidateCosting()
    return { ok: true }
  } catch (e) { return { ok: false, error: errMsg(e) } }
}

const recipeLineSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("PRODUCT"), productId: z.string().min(1), quantity: z.number().positive(), uomCode: z.string().min(1), notes: z.string().max(500).optional() }),
  z.object({ kind: z.literal("COST_ADJUSTMENT"), label: z.string().trim().min(1), quantity: z.number().positive().default(1), fixedUnitCost: z.number().nonnegative(), notes: z.string().max(500).optional() }),
])
const aliasSchema = z.object({ title: z.string().trim().min(1), posItemId: z.string().regex(/^\d+$/).optional().or(z.literal("")), isPrimary: z.boolean().default(false) })
const recipeSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  kind: z.enum(["SEMI_FINISHED", "MENU"]),
  outputProductId: z.string().optional().nullable(),
  outputQty: z.number().positive(),
  outputUomCode: z.string().min(1),
  referenceSellPrice: z.number().positive().optional().nullable(),
  targetFoodCostPct: z.number().positive().max(1),
  notes: z.string().max(2000).optional(),
  lines: z.array(recipeLineSchema).min(1),
  aliases: z.array(aliasSchema).default([]),
})
export type RecipeSaveInput = z.input<typeof recipeSchema>

export async function saveRecipe(input: RecipeSaveInput): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireAction("recipe.edit", KANTIN)
    const data = recipeSchema.parse(input)
    const normalizedAliases = data.aliases.map((a) => ({ ...a, normalizedTitle: normalizeRecipeTitle(a.title) }))
    if (new Set(normalizedAliases.map((a) => a.normalizedTitle)).size !== normalizedAliases.length) throw new Error("Recipe aliases must be unique.")
    if (normalizedAliases.filter((a) => a.isPrimary).length > 1) throw new Error("Only one POS alias can be primary.")

    const id = await prisma.$transaction(async (tx) => {
      const productIds = data.lines.filter((l): l is Extract<typeof l, { kind: "PRODUCT" }> => l.kind === "PRODUCT").map((l) => l.productId)
      const foundProducts = await tx.product.findMany({ where: { id: { in: productIds }, kantinSlug: KANTIN, isActive: true }, include: { productUoms: { where: { isActive: true } } } })
      if (foundProducts.length !== new Set(productIds).size) throw new Error("One or more recipe products are invalid.")
      const validUoms = await tx.unitOfMeasure.count({ where: { code: { in: [data.outputUomCode, ...data.lines.filter((l) => l.kind === "PRODUCT").map((l) => l.uomCode)] }, isActive: true } })
      const uniqueUoms = new Set([data.outputUomCode, ...data.lines.filter((l) => l.kind === "PRODUCT").map((l) => l.uomCode)])
      if (validUoms !== uniqueUoms.size) throw new Error("One or more units of measure are invalid.")
      const productById = new Map(foundProducts.map((p) => [p.id, p]))
      for (const line of data.lines.filter((l) => l.kind === "PRODUCT")) {
        const p = productById.get(line.productId)!
        convert(line.quantity, line.uomCode, p.stockUomCode ?? p.unit, {
          stockUomCode: p.stockUomCode ?? p.unit,
          productUoms: Object.fromEntries(p.productUoms.map((u) => [u.uomCode, Number(u.qtyInStockUom)])),
        })
      }

      let outputProductId = data.outputProductId || null
      if (data.kind === "SEMI_FINISHED") {
        if (!outputProductId) {
          const output = await tx.product.create({ data: {
            kantinSlug: KANTIN, name: data.name, kind: "SEMI_FINISHED", stockUomCode: data.outputUomCode,
            unit: legacyUnit(data.outputUomCode), costingCategory: "Semi-finished", isCostingActive: true, notes: data.notes || null,
          } })
          outputProductId = output.id
        } else {
          const output = await tx.product.findFirst({ where: { id: outputProductId, kantinSlug: KANTIN } })
          if (!output) throw new Error("Output product not found.")
          convert(data.outputQty, data.outputUomCode, output.stockUomCode ?? output.unit)
          await tx.product.update({ where: { id: output.id }, data: { name: data.name, kind: "SEMI_FINISHED", costingCategory: "Semi-finished", isCostingActive: true } })
        }
      } else outputProductId = null

      let recipe = data.id ? await tx.recipe.findFirst({ where: { id: data.id, kantinSlug: KANTIN }, include: { activeVersion: true } }) : null
      if (data.id && !recipe) throw new Error("Recipe not found.")
      if (!recipe) {
        recipe = await tx.recipe.create({ data: { kantinSlug: KANTIN, name: data.name, kind: data.kind, outputProductId, status: "ACTIVE" }, include: { activeVersion: true } })
      } else {
        recipe = await tx.recipe.update({ where: { id: recipe.id }, data: { name: data.name, kind: data.kind, outputProductId, status: "ACTIVE" }, include: { activeVersion: true } })
      }

      if (data.kind === "SEMI_FINISHED" && outputProductId) {
        const semis = await tx.recipe.findMany({
          where: { kantinSlug: KANTIN, kind: "SEMI_FINISHED", status: { not: "ARCHIVED" } },
          include: { activeVersion: { include: { lines: { where: { kind: "PRODUCT" }, select: { productId: true } } } } },
        })
        const dependencies = new Map<string, string[]>()
        for (const semi of semis) if (semi.outputProductId && semi.id !== recipe.id) dependencies.set(semi.outputProductId, semi.activeVersion?.lines.map((l) => l.productId).filter((id): id is string => !!id) ?? [])
        dependencies.set(outputProductId, data.lines.filter((l) => l.kind === "PRODUCT").map((l) => l.productId))
        assertAcyclicProduct(outputProductId, dependencies)
      }

      const last = await tx.recipeVersion.aggregate({ where: { recipeId: recipe.id }, _max: { version: true } })
      const now = new Date()
      if (recipe.activeVersionId) await tx.recipeVersion.update({ where: { id: recipe.activeVersionId }, data: { effectiveTo: now } })
      const version = await tx.recipeVersion.create({ data: {
        recipeId: recipe.id, version: (last._max.version ?? 0) + 1, outputQty: data.outputQty, outputUomCode: data.outputUomCode,
        referenceSellPrice: data.referenceSellPrice ?? null, targetFoodCostPct: data.targetFoodCostPct,
        effectiveFrom: now, notes: data.notes || null, createdById: user.id,
        lines: { create: data.lines.map((line, sortOrder) => line.kind === "PRODUCT"
          ? { kind: "PRODUCT", productId: line.productId, quantity: line.quantity, uomCode: line.uomCode, sortOrder, notes: line.notes || null }
          : { kind: "COST_ADJUSTMENT", label: line.label, quantity: line.quantity, fixedUnitCost: line.fixedUnitCost, sortOrder, notes: line.notes || null }) },
      } })
      await tx.recipe.update({ where: { id: recipe.id }, data: { activeVersionId: version.id } })

      await tx.recipeAlias.deleteMany({ where: { recipeId: recipe.id } })
      if (normalizedAliases.length) await tx.recipeAlias.createMany({ data: normalizedAliases.map((a) => ({
        kantinSlug: KANTIN, recipeId: recipe!.id, title: a.title, normalizedTitle: a.normalizedTitle,
        posItemId: a.posItemId ? BigInt(a.posItemId) : null, isPrimary: a.isPrimary,
      })) })
      await logAudit(tx, {
        actorId: user.id, actorRole: user.role, kantinSlug: KANTIN, action: data.id ? "recipe.revised" : "recipe.created",
        entityType: "Recipe", entityId: recipe.id, summary: `${data.id ? "Created revision" : "Created"} ${data.name} v${version.version}`,
        metadata: { version: version.version, lineCount: data.lines.length, aliasCount: data.aliases.length }, ip: clientIp(),
      })
      return recipe.id
    })
    revalidateCosting()
    return { ok: true, data: { id } }
  } catch (e) { return { ok: false, error: errMsg(e) } }
}

const oilSchema = z.object({
  recipeId: z.string().min(1), unitsSold: z.number().int().nonnegative(), friesGrams: z.number().nonnegative(),
  breadedGrams: z.number().nonnegative(), soakFactor: z.number().positive(), cost: z.number().nonnegative(),
})

export async function updateOilAllocation(input: z.input<typeof oilSchema>): Promise<ActionResult> {
  try {
    const user = await requireAction("recipe.edit", KANTIN)
    const data = oilSchema.parse(input)
    await prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.findFirst({ where: { id: data.recipeId, kantinSlug: KANTIN }, include: { activeVersion: { include: { lines: { orderBy: { sortOrder: "asc" } } } }, oilAllocation: true } })
      if (!recipe?.activeVersion) throw new Error("Active recipe not found.")
      const old = recipe.activeVersion
      const last = await tx.recipeVersion.aggregate({ where: { recipeId: recipe.id }, _max: { version: true } })
      const now = new Date()
      await tx.recipeVersion.update({ where: { id: old.id }, data: { effectiveTo: now } })
      let hasOil = false
      const copied = old.lines.map((line) => {
        const isOil = line.kind === "COST_ADJUSTMENT" && /oil/i.test(line.label ?? "")
        if (isOil) hasOil = true
        return { kind: line.kind, productId: line.productId, label: line.label, quantity: line.quantity, uomCode: line.uomCode, fixedUnitCost: isOil ? new Prisma.Decimal(data.cost) : line.fixedUnitCost, sortOrder: line.sortOrder, notes: line.notes }
      })
      if (!hasOil) copied.push({ kind: "COST_ADJUSTMENT", productId: null, label: "Frying oil (allocated)", quantity: new Prisma.Decimal(1), uomCode: null, fixedUnitCost: new Prisma.Decimal(data.cost), sortOrder: copied.length, notes: null })
      const version = await tx.recipeVersion.create({ data: {
        recipeId: recipe.id, version: (last._max.version ?? old.version) + 1, outputQty: old.outputQty, outputUomCode: old.outputUomCode,
        referenceSellPrice: old.referenceSellPrice, targetFoodCostPct: old.targetFoodCostPct, effectiveFrom: now,
        notes: old.notes, createdById: user.id, lines: { create: copied },
      } })
      await tx.recipe.update({ where: { id: recipe.id }, data: { activeVersionId: version.id } })
      await tx.oilAllocationSetting.upsert({
        where: { recipeId: recipe.id },
        update: { unitsSold: data.unitsSold, friesGrams: data.friesGrams, breadedGrams: data.breadedGrams, soakFactor: data.soakFactor, allocatedCostPerUnit: data.cost },
        create: { recipeId: recipe.id, unitsSold: data.unitsSold, friesGrams: data.friesGrams, breadedGrams: data.breadedGrams, soakFactor: data.soakFactor, allocatedCostPerUnit: data.cost },
      })
      await logAudit(tx, { actorId: user.id, actorRole: user.role, kantinSlug: KANTIN, action: "recipe.oil_updated", entityType: "Recipe", entityId: recipe.id, summary: `Updated ${recipe.name} oil allocation to Rs ${data.cost.toFixed(2)}/unit`, metadata: data, ip: clientIp() })
    })
    revalidateCosting()
    return { ok: true }
  } catch (e) { return { ok: false, error: errMsg(e) } }
}

function legacyUnit(code: string): "KG" | "GRAM" | "LITRE" | "ML" | "PIECE" | "PACK" | "BOX" | "BOTTLE" {
  return (["KG", "GRAM", "LITRE", "ML", "PIECE", "PACK", "BOX", "BOTTLE"] as const).find((x) => x === code) ?? "PIECE"
}

function assertAcyclicProduct(root: string, dependencies: Map<string, string[]>) {
  const visiting = new Set<string>()
  const visited = new Set<string>()
  function visit(productId: string, path: string[]) {
    if (visiting.has(productId)) throw new Error(`Semi-finished recipe cycle detected (${[...path, productId].join(" → ")}).`)
    if (visited.has(productId)) return
    visiting.add(productId)
    for (const dependency of dependencies.get(productId) ?? []) if (dependencies.has(dependency)) visit(dependency, [...path, productId])
    visiting.delete(productId); visited.add(productId)
  }
  visit(root, [])
}

function revalidateCosting() {
  for (const path of ["/h8/costing", "/h8/costing/ingredients", "/h8/costing/semis", "/h8/costing/recipes", "/h8/costing/usage"]) revalidatePath(path)
}

function errMsg(e: unknown): string {
  if (e instanceof z.ZodError) return e.issues[0]?.message ?? "Invalid input."
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return "That name, POS item, or alias is already assigned."
  if (e instanceof Error) {
    if (e.name === "PermissionError") return "You don't have permission to do that."
    return e.message
  }
  return "Something went wrong."
}
