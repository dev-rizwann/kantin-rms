import { PageHeader } from "@/components/PageHeader"
import { getCostingIngredients } from "@/lib/recipes"
import { prisma } from "@/lib/prisma"
import { IngredientTable } from "./IngredientTable"
import { canCurrent } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function IngredientsPage() {
  const [ingredients, canEdit, uoms] = await Promise.all([
    getCostingIngredients("h8"),
    canCurrent("product.override", "h8"),
    prisma.unitOfMeasure.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { code: true, name: true } }),
  ])
  return <><PageHeader title="Costing Ingredients" subtitle="Pack price ÷ pack quantity = live stock-unit cost. Changes are written to cost history." /><IngredientTable ingredients={ingredients} canEdit={canEdit} uoms={uoms} /></>
}
