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
    {canEdit && <div className="mb-4 flex justify-end"><Link href="/h8/costing/semis/new" className="btn-primary"><span className="mr-1.5 text-lg leading-none">+</span> New preparation</Link></div>}
    <div className="editor-card overflow-hidden"><table className="w-full text-[11.5px] leading-tight"><thead><tr className="border-b border-stone-200 bg-stone-50/80 text-[10.5px] uppercase tracking-wide text-stone-400"><th className="px-2.5 py-1.5 text-left">Preparation</th><th className="px-2.5 py-1.5 text-right">Batch output</th><th className="px-2.5 py-1.5 text-right">Batch cost</th><th className="px-2.5 py-1.5 text-right">Cost / output unit</th><th className="px-2.5 py-1.5 text-left">Revision</th><th className="px-2.5 py-1.5"></th></tr></thead>
      <tbody className="divide-y divide-stone-100">{rows.map((r) => <tr key={r.id} className="hover:bg-coral-50/60"><td className="whitespace-nowrap px-2.5 py-[3px] font-semibold text-stone-900">{r.name}{r.outputProduct && r.outputProduct !== r.name && <span className="ml-2 text-[10px] font-normal text-stone-400">→ {r.outputProduct}</span>}</td><td className="whitespace-nowrap px-2.5 py-[3px] text-right tabular-nums">{num(r.outputQty)} {r.outputUomCode}</td><td className="whitespace-nowrap px-2.5 py-[3px] text-right tabular-nums">{money(r.cost)}</td><td className="whitespace-nowrap px-2.5 py-[3px] text-right font-medium tabular-nums">{r.costPerUnit == null ? "—" : `Rs ${r.costPerUnit.toFixed(4)} / ${r.outputUomCode}`}</td><td className="whitespace-nowrap px-2.5 py-[3px]"><Badge tone={r.flags ? "warn" : "ok"}>v{r.version}{r.flags ? ` · ${r.flags} issue` : ""}</Badge></td><td className="whitespace-nowrap px-2.5 py-[3px] text-right">{canEdit && <Link href={`/h8/costing/semis/${r.id}`} className="inline-flex rounded border border-stone-200 bg-white px-2 py-[2px] text-[10px] font-semibold text-stone-600 transition hover:border-coral-200 hover:bg-coral-50 hover:text-coral-700">Edit</Link>}</td></tr>)}</tbody>
    </table></div>
  </>
}
