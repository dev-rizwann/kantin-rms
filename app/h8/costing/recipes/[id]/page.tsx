import { notFound } from "next/navigation"
import { PageHeader } from "@/components/PageHeader"
import { getRecipeEditorData } from "@/lib/recipes"
import { RecipeForm } from "../../RecipeForm"
import { requireAction } from "@/lib/server-auth"

export const dynamic = "force-dynamic"
export default async function EditRecipePage({ params }: { params: { id: string } }) { await requireAction("recipe.edit", "h8"); const data = await getRecipeEditorData("h8", params.id); if (!data.recipe || data.recipe.kind !== "MENU") notFound(); return <><PageHeader title={data.recipe.name} chips={[`Revision ${data.recipe.cost.version}`, "immutable history"]} /><RecipeForm kind="MENU" products={data.products} uoms={data.uoms} posItems={data.posItems} existing={data.recipe} /></> }
