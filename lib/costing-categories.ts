import { prisma } from "@/lib/prisma"

/** Starter set created for every kantin by the costing-categories migration.
 *  Kept here only so a fresh seed can recreate it — the live list is the
 *  CostingCategory table, which users add to themselves. */
export const STARTER_COSTING_CATEGORIES = [
  "Bakery & Carbs",
  "Beverages",
  "Dairy",
  "Dry Goods & Spices",
  "Oil",
  "Packaging",
  "Produce",
  "Protein",
  "Sauces & Condiments",
  "Semi-finished",
] as const

export interface CostingCategoryRow { id: string; name: string; inUse: number }

/** Managed categories plus any name still stored on a product but missing from
 *  the table (possible if a product was edited by hand), so nothing disappears
 *  from the pickers. Sorted by sortOrder then name. */
export async function getCostingCategories(kantinSlug: string): Promise<CostingCategoryRow[]> {
  const [managed, used] = await Promise.all([
    prisma.costingCategory.findMany({
      where: { kantinSlug, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.product.groupBy({
      by: ["costingCategory"],
      where: { kantinSlug, costingCategory: { not: null } },
      _count: { _all: true },
    }),
  ])
  const counts = new Map(used.map((u) => [u.costingCategory ?? "", u._count._all]))
  const rows = managed.map((c) => ({ id: c.id, name: c.name, inUse: counts.get(c.name) ?? 0 }))
  const known = new Set(managed.map((c) => c.name))
  for (const [name, inUse] of counts) if (name && !known.has(name)) rows.push({ id: `unmanaged:${name}`, name, inUse })
  return rows
}
