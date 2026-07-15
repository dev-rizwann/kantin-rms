import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { Badge } from "@/components/ui"
import { money, pct } from "@/lib/format"
import { getRecipeLists } from "@/lib/recipes"
import { canCurrent } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function RecipesPage() {
  const [allRows, canEdit] = await Promise.all([getRecipeLists("h8"), canCurrent("recipe.edit", "h8")])
  const rows = allRows.filter((r) => r.kind === "MENU").sort((a, b) => (b.foodCostPct ?? -1) - (a.foodCostPct ?? -1))
  return <>
    <PageHeader title="Menu Recipes" subtitle="Every save creates a new immutable revision; historical versions remain available for audit and usage costing." />
    {canEdit && <div className="mb-4 flex justify-end"><Link href="/h8/costing/recipes/new" className="btn-primary"><span className="mr-1.5 text-lg leading-none">+</span> New menu recipe</Link></div>}
    <div className="editor-card overflow-hidden"><table className="w-full text-[13px]"><thead><tr className="border-b border-stone-200 bg-stone-50/80 text-[10.5px] uppercase tracking-wide text-stone-400"><th className="px-3 py-2 text-left">Recipe</th><th className="px-3 py-2 text-right">Plate cost</th><th className="px-3 py-2 text-right">Reference price</th><th className="px-3 py-2 text-right">Food cost</th><th className="px-3 py-2 text-left">Revision</th><th className="px-3 py-2"></th></tr></thead>
      <tbody className="divide-y divide-stone-100">{rows.map((r) => { const tone = r.flags || (r.foodCostPct ?? 0) > .75 ? "bad" : (r.foodCostPct ?? 0) > .55 ? "warn" : "ok"; return <tr key={r.id} className="hover:bg-coral-50/60"><td className="px-3 py-2.5 font-semibold text-stone-900">{r.name}</td><td className="px-3 py-2.5 text-right font-medium tabular-nums">{money(r.cost)}</td><td className="px-3 py-2.5 text-right tabular-nums">{money(r.sellPrice)}</td><td className="px-3 py-2.5 text-right font-semibold tabular-nums">{pct(r.foodCostPct)}</td><td className="px-3 py-2.5"><Badge tone={tone}>v{r.version}{r.flags ? ` · ${r.flags} issue` : ""}</Badge></td><td className="px-3 py-2.5 text-right">{canEdit && <Link href={`/h8/costing/recipes/${r.id}`} className="inline-flex rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-stone-600 transition hover:border-coral-200 hover:bg-coral-50 hover:text-coral-700">Open editor</Link>}</td></tr> })}</tbody>
    </table></div>
  </>
}
