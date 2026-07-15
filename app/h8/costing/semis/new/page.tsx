import { PageHeader } from "@/components/PageHeader"
import { getRecipeEditorData } from "@/lib/recipes"
import { RecipeForm } from "../../RecipeForm"
import { requireAction } from "@/lib/server-auth"

export const dynamic = "force-dynamic"
export default async function NewSemiPage() { await requireAction("recipe.edit", "h8"); const data = await getRecipeEditorData("h8"); return <><PageHeader title="New Semi-finished Recipe" subtitle="Define the input batch and the actual output yield." /><RecipeForm kind="SEMI_FINISHED" {...data} /></> }
