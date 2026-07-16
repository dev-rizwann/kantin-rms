/* eslint-disable no-console */
import { Prisma, PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { UOM_SEED, convert } from "../lib/uom"
import {
  OIL_ALLOCATIONS,
  UNLINKED_OIL_CONSUMERS,
  RECIPE_ALIASES,
  WORKBOOK_INGREDIENTS,
  WORKBOOK_RECIPES,
  ingredientCategory,
  ingredientKind,
} from "./recipe-seed-data"
import { normalizeRecipeTitle } from "../lib/recipe-title"
import { calculateOilAllocation } from "../lib/oil-allocation"

const prisma = new PrismaClient()
const KANTIN = "h8"

async function seedUoms() {
  for (const u of UOM_SEED) {
    await prisma.unitOfMeasure.upsert({
      where: { code: u.code },
      update: { name: u.name, nameUr: u.nameUr ?? null, dimension: u.dimension, isBaseForDimension: u.isBaseForDimension, ratioToBase: u.ratioToBase, sortOrder: u.sortOrder, isActive: true },
      create: { code: u.code, name: u.name, nameUr: u.nameUr ?? null, dimension: u.dimension, isBaseForDimension: u.isBaseForDimension, ratioToBase: u.ratioToBase, sortOrder: u.sortOrder, isActive: true },
    })
  }

  const byDimension = new Map<string, typeof UOM_SEED>()
  for (const u of UOM_SEED) byDimension.set(u.dimension, [...(byDimension.get(u.dimension) ?? []), u])
  for (const units of byDimension.values()) {
    const base = units.find((u) => u.isBaseForDimension)!
    for (const u of units) {
      if (u.code === base.code) continue
      for (const [from, to, factor] of [[u.code, base.code, u.ratioToBase], [base.code, u.code, 1 / u.ratioToBase]] as const) {
        await prisma.uomConversion.upsert({
          where: { fromUomCode_toUomCode: { fromUomCode: from, toUomCode: to } },
          update: { factor, dimension: u.dimension },
          create: { fromUomCode: from, toUomCode: to, factor, dimension: u.dimension },
        })
      }
    }
  }
  console.log(`✓ Seeded ${UOM_SEED.length} units of measure`)
}

async function seedWorkbookCosting() {
  const products = new Map<string, { id: string; stockUomCode: string | null }>()
  const workbookUom = new Map<string, string>(WORKBOOK_INGREDIENTS.map(([name, uomCode]) => [name, uomCode]))

  for (const [name, stockUomCode, packPrice, packQty, note] of WORKBOOK_INGREDIENTS) {
    const estimated = /assume|internet|confirm|re-weigh|verify density/i.test(note)
    const costingActive = !["Sauce Blend", "Fries Sauce"].includes(name)
    const key = { kantinSlug_name: { kantinSlug: KANTIN, name } }
    const existing = await prisma.product.findUnique({ where: key })
    const actualStockUom = existing?.stockUomCode ?? existing?.unit ?? stockUomCode
    const packQtyInStockUom = convert(packQty, stockUomCode, actualStockUom)
    const unitCost = new Prisma.Decimal(packPrice).div(packQtyInStockUom)
    const common = {
      kind: ingredientKind(name),
      costingCategory: ingredientCategory(name),
      standardPackPrice: new Prisma.Decimal(packPrice),
      standardPackQty: new Prisma.Decimal(packQtyInStockUom),
      costingNote: note,
      costIsEstimated: estimated,
      isCostingActive: costingActive,
      notes: note,
    }
    const product = existing
      ? await prisma.product.update({ where: { id: existing.id }, data: { ...common, ...(existing.avgCost == null ? { avgCost: unitCost, lastPurchaseCost: unitCost } : {}) } })
      : await prisma.product.create({ data: { kantinSlug: KANTIN, name, ...common, stockUomCode, unit: stockUomCode, avgCost: unitCost, lastPurchaseCost: unitCost } })
    products.set(name, product)

    const imported = await prisma.productCostHistory.findFirst({ where: { productId: product.id, sourceType: "WORKBOOK_IMPORT" } })
    if (!imported) {
      await prisma.productCostHistory.create({ data: {
        productId: product.id, effectiveAt: new Date("2026-07-15T00:00:00+05:00"), oldAvgCost: null, newAvgCost: unitCost,
        qtyOnHandAtCalc: 0, inboundQty: 0, inboundUnitCost: unitCost, sourceType: "WORKBOOK_IMPORT", sourceId: "Kantin_Menu_Costing_LINKED.xlsx",
      } })
    }
  }

  for (const seed of WORKBOOK_RECIPES.filter((r) => r.kind === "SEMI_FINISHED")) {
    const name = seed.outputProduct!
    workbookUom.set(name, seed.outputUomCode)
    const existing = await prisma.product.findUnique({ where: { kantinSlug_name: { kantinSlug: KANTIN, name } } })
    const product = await prisma.product.upsert({
      where: { kantinSlug_name: { kantinSlug: KANTIN, name } },
      update: { kind: "SEMI_FINISHED", costingCategory: "Semi-finished", isCostingActive: true },
      create: { kantinSlug: KANTIN, name, kind: "SEMI_FINISHED", stockUomCode: seed.outputUomCode, unit: seed.outputUomCode, costingCategory: "Semi-finished", isCostingActive: true, notes: seed.notes },
    })
    if (existing && (existing.stockUomCode ?? existing.unit) !== seed.outputUomCode) console.warn(`  ⚠ Preserved existing ${name} stock UoM ${(existing.stockUomCode ?? existing.unit)}; recipe output converts from ${seed.outputUomCode}`)
    products.set(name, product)
  }

  for (const seed of WORKBOOK_RECIPES) {
    const outputProductId = seed.outputProduct ? products.get(seed.outputProduct)?.id : null
    let recipe = await prisma.recipe.upsert({
      where: { kantinSlug_name: { kantinSlug: KANTIN, name: seed.name } },
      update: { kind: seed.kind, outputProductId, status: "ACTIVE" },
      create: { kantinSlug: KANTIN, name: seed.name, kind: seed.kind, outputProductId, status: "ACTIVE" },
      include: { versions: { select: { id: true }, take: 1 } },
    })

    if (recipe.versions.length === 0) {
      const version = await prisma.recipeVersion.create({
        data: {
          recipeId: recipe.id,
          version: 1,
          outputQty: seed.outputQty,
          outputUomCode: seed.outputUomCode,
          referenceSellPrice: seed.referenceSellPrice,
          targetFoodCostPct: 0.33,
          effectiveFrom: new Date("2026-07-15T00:00:00+05:00"),
          notes: seed.notes ?? "Imported from Kantin_Menu_Costing_LINKED.xlsx",
          lines: {
            create: seed.lines.map((line, sortOrder) => {
              if ("adjustment" in line) return { kind: "COST_ADJUSTMENT" as const, label: line.adjustment, quantity: 1, fixedUnitCost: line.cost, sortOrder }
              const product = products.get(line.product)
              if (!product) throw new Error(`Seed product not found: ${line.product}`)
              return { kind: "PRODUCT" as const, productId: product.id, quantity: line.qty, uomCode: line.uomCode ?? workbookUom.get(line.product) ?? product.stockUomCode, sortOrder }
            }),
          },
        },
      })
      recipe = await prisma.recipe.update({ where: { id: recipe.id }, data: { activeVersionId: version.id }, include: { versions: { select: { id: true }, take: 1 } } })
    }

    for (const alias of RECIPE_ALIASES[seed.name] ?? []) {
      const normalizedTitle = normalizeRecipeTitle(alias.title)
      await prisma.recipeAlias.upsert({
        where: { kantinSlug_normalizedTitle: { kantinSlug: KANTIN, normalizedTitle } },
        update: { recipeId: recipe.id, title: alias.title, posItemId: alias.posItemId != null ? BigInt(alias.posItemId) : null, isPrimary: !!alias.primary },
        create: { kantinSlug: KANTIN, recipeId: recipe.id, title: alias.title, normalizedTitle, posItemId: alias.posItemId != null ? BigInt(alias.posItemId) : null, isPrimary: !!alias.primary },
      })
    }

    const oil = OIL_ALLOCATIONS[seed.name]
    if (oil && !(await prisma.oilAllocationSetting.findUnique({ where: { recipeId: recipe.id } }))) {
      await prisma.oilAllocationSetting.create({ data: {
        kantinSlug: KANTIN, name: seed.name, recipeId: recipe.id, unitsSold: oil.unitsSold,
        friesGrams: oil.friesGrams, breadedGrams: oil.breadedGrams, directOilMl: oil.directOilMl ?? 0,
        directCostInRecipe: oil.directCostInRecipe ?? false, directOilUnitCost: 0.59375,
        soakFactor: 1.25, allocatedCostPerUnit: oil.cost, sourceTotalOilSpend: 480000,
        sourceStart: new Date("2025-12-27T00:00:00+05:00"), sourceEnd: new Date("2026-07-10T23:59:59+05:00"), notes: oil.notes,
      } })
    }
  }

  for (const oil of UNLINKED_OIL_CONSUMERS) {
    await prisma.oilAllocationSetting.upsert({
      where: { kantinSlug_name: { kantinSlug: KANTIN, name: oil.name } },
      update: {},
      create: {
        kantinSlug: KANTIN, name: oil.name, unitsSold: oil.unitsSold,
        friesGrams: oil.friesGrams, breadedGrams: oil.breadedGrams, directOilMl: oil.directOilMl,
        directCostInRecipe: false, directOilUnitCost: 0.59375, soakFactor: 1.25,
        allocatedCostPerUnit: 0, sourceTotalOilSpend: 480000,
        sourceStart: new Date("2025-12-27T00:00:00+05:00"),
        sourceEnd: new Date("2026-07-10T23:59:59+05:00"), notes: oil.notes,
      },
    })
  }

  const oilSettings = await prisma.oilAllocationSetting.findMany({
    where: { kantinSlug: KANTIN },
    include: { recipe: { include: { activeVersion: { include: { lines: true } } } } },
  })
  const oilModel = calculateOilAllocation(
    oilSettings.map((setting) => ({
      id: setting.id,
      unitsSold: setting.unitsSold,
      friesGrams: Number(setting.friesGrams),
      breadedGrams: Number(setting.breadedGrams),
      directOilMl: Number(setting.directOilMl),
      directCostInRecipe: setting.directCostInRecipe,
    })),
    { totalOilSpend: 480000, directOilUnitCost: 0.59375, breadedFactor: 1.25 },
  )
  const oilById = new Map(oilModel.rows.map((row) => [row.id, row]))
  for (const setting of oilSettings) {
    const result = oilById.get(setting.id)!
    await prisma.oilAllocationSetting.update({
      where: { id: setting.id },
      data: { allocatedCostPerUnit: result.recipeAdjustmentPerUnit },
    })
    const version = setting.recipe?.activeVersion
    if (!version) continue
    const oilLine = version.lines.find((line) => line.kind === "COST_ADJUSTMENT" && /oil/i.test(line.label ?? ""))
    if (oilLine) {
      await prisma.recipeLine.update({
        where: { id: oilLine.id },
        data: {
          label: "Oil allocation (calibrated)", quantity: 1,
          fixedUnitCost: result.recipeAdjustmentPerUnit, notes: "Six-month oil pool allocation",
        },
      })
    } else if (result.recipeAdjustmentPerUnit > 0) {
      await prisma.recipeLine.create({
        data: {
          recipeVersionId: version.id, kind: "COST_ADJUSTMENT", label: "Oil allocation (calibrated)",
          quantity: 1, fixedUnitCost: result.recipeAdjustmentPerUnit,
          sortOrder: version.lines.length, notes: "Six-month oil pool allocation",
        },
      })
    }
  }

  console.log(`✓ Seeded ${WORKBOOK_INGREDIENTS.length} workbook ingredients, 3 semis, 12 menu recipes and POS aliases`)
}

async function main() {
  const kantins = [
    { slug: "h8", name: "H-8 Kantin", city: "Islamabad", fullAddress: "H-8, Islamabad", isLive: true },
    { slug: "chak-shahzad", name: "Chak Shahzad Kantin", city: "Islamabad", fullAddress: "Chak Shahzad, Islamabad", isLive: false },
    { slug: "model-town-multan", name: "Model Town Kantin", city: "Multan", fullAddress: "Model Town, Multan", isLive: false },
  ]
  for (const k of kantins) await prisma.kantin.upsert({ where: { slug: k.slug }, update: k, create: k })
  console.log("✓ Seeded 3 kantins")

  await seedUoms()

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@iespl.org"
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!"
  const adminName = process.env.SEED_ADMIN_NAME ?? "Administrator"
  const passwordHash = await bcrypt.hash(adminPassword, 10)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail }, update: {},
    create: { email: adminEmail, name: adminName, passwordHash, role: Role.ADMIN, isActive: true, kantinSlug: null },
  })
  console.log(`✓ Admin user ready: ${admin.email}`)
  if (adminPassword === "ChangeMe123!") console.log("  ⚠ Default password is ChangeMe123! — change it after first login")

  await seedWorkbookCosting()
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
