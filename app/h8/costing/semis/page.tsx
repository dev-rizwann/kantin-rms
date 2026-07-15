import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { Badge } from "@/components/ui"
import { money, num } from "@/lib/format"
import { getRecipeLists } from "@/lib/recipes"
import { canCurrent } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function SemisPage() {
  const [allRows, canEdit] = await Promise.all([getRecipeLists("h8"), canCurrent("recipe.edit", "h8")])
  const rows = allRows.filter((r) => r.kind === "SEMI_FINISHED")
  return <>
    <PageHeader title="Semi-finished Preparations" subtitle="Reusable kitchen batches. Input cost is divided by actual output yield." />
    {canEdit && <div className="mb-4"><Link href="/h8/costing/semis/new" className="rounded-lg bg-coral-600 px-4 py-2 text-sm font-medium text-white hover:bg-coral-700">+ New semi-finished recipe</Link></div>}
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white"><table className="w-full text-[13px]"><thead><tr className="border-b border-stone-200 bg-stone-50/80 text-[10.5px] uppercase tracking-wide text-stone-400"><th className="px-3 py-2 text-left">Preparation</th><th className="px-3 py-2 text-right">Batch output</th><th className="px-3 py-2 text-right">Batch cost</th><th className="px-3 py-2 text-right">Cost / output unit</th><th className="px-3 py-2 text-left">Revision</th><th className="px-3 py-2"></th></tr></thead>
      <tbody className="divide-y divide-stone-100">{rows.map((r) => <tr key={r.id} className="hover:bg-coral-50/60"><td className="px-3 py-2 font-medium text-stone-900">{r.name}<div className="text-[10.5px] text-stone-400">output product: {r.outputProduct}</div></td><td className="px-3 py-2 text-right tabular-nums">{num(r.outputQty)} {r.outputUomCode}</td><td className="px-3 py-2 text-right tabular-nums">{money(r.cost)}</td><td className="px-3 py-2 text-right font-medium tabular-nums">{r.costPerUnit == null ? "—" : `Rs ${r.costPerUnit.toFixed(4)} / ${r.outputUomCode}`}</td><td className="px-3 py-2"><Badge tone={r.flags ? "warn" : "ok"}>v{r.version}{r.flags ? ` · ${r.flags} issue` : ""}</Badge></td><td className="px-3 py-2 text-right">{canEdit && <Link href={`/h8/costing/semis/${r.id}`} className="font-medium text-coral-700 hover:underline">Edit</Link>}</td></tr>)}</tbody>
    </table></div>
  </>
}
