/**
 * Seeds the UnitOfMeasure catalog + the dimension-level UomConversion pairs.
 * Idempotent (upsert). Run after schema is applied:
 *   tsx prisma/seed-uom.ts
 */
import { PrismaClient } from "@prisma/client"
import { UOM_SEED } from "../lib/uom"

const prisma = new PrismaClient()

async function main() {
  for (const u of UOM_SEED) {
    await prisma.unitOfMeasure.upsert({
      where: { code: u.code },
      update: {
        name: u.name,
        nameUr: u.nameUr ?? null,
        dimension: u.dimension as any,
        isBaseForDimension: u.isBaseForDimension,
        ratioToBase: u.ratioToBase,
        sortOrder: u.sortOrder,
        isActive: true,
      },
      create: {
        code: u.code,
        name: u.name,
        nameUr: u.nameUr ?? null,
        dimension: u.dimension as any,
        isBaseForDimension: u.isBaseForDimension,
        ratioToBase: u.ratioToBase,
        sortOrder: u.sortOrder,
        isActive: true,
      },
    })
  }
  console.log(`✓ Seeded ${UOM_SEED.length} units of measure`)

  // Dimension-level conversion pairs (both directions) for non-base units.
  const pairs: { from: string; to: string; factor: number; dim: string }[] = []
  const byDim: Record<string, typeof UOM_SEED> = {}
  for (const u of UOM_SEED) (byDim[u.dimension] ??= []).push(u)
  for (const dim of Object.keys(byDim)) {
    const base = byDim[dim].find((x) => x.isBaseForDimension)!
    for (const u of byDim[dim]) {
      if (u.code === base.code) continue
      // u -> base: multiply by ratioToBase ; base -> u: divide
      pairs.push({ from: u.code, to: base.code, factor: u.ratioToBase, dim })
      pairs.push({ from: base.code, to: u.code, factor: 1 / u.ratioToBase, dim })
    }
  }
  for (const p of pairs) {
    await prisma.uomConversion.upsert({
      where: { fromUomCode_toUomCode: { fromUomCode: p.from, toUomCode: p.to } },
      update: { factor: p.factor, dimension: p.dim as any },
      create: { fromUomCode: p.from, toUomCode: p.to, factor: p.factor, dimension: p.dim as any },
    })
  }
  console.log(`✓ Seeded ${pairs.length} dimension-level conversions`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
