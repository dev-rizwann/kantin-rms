import { PageHeader } from "@/components/PageHeader"
import { getRecipeEditorData } from "@/lib/recipes"
import { RecipeForm } from "../../RecipeForm"
import { requireAction } from "@/lib/server-auth"

export const dynamic = "force-dynamic"
export default async function NewRecipePage() { await requireAction("recipe.edit", "h8"); const data = await getRecipeEditorData("h8"); return <><PageHeader title="New Menu Recipe" subtitle="Build a plate from raw, semi-finished, and packaging products." /><RecipeForm kind="MENU" {...data} /></> }
