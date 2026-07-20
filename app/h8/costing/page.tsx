import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { Badge, KpiStrip, SectionHead, type Kpi } from "@/components/ui"
import { money, num, pct } from "@/lib/format"
import { getCostingDashboard } from "@/lib/recipes"
import { OilAllocationCard } from "./OilAllocationCard"
import { canCurrent } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function CostingPage() {
  const [data, canEdit] = await Promise.all([getCostingDashboard("h8"), canCurrent("recipe.edit", "h8")])
  const kpis: Kpi[] = [
    { label: "Menu recipes", value: num(data.kpis.recipes), sub: `${data.kpis.semis} reusable semis` },
    { label: "Costed ingredients", value: num(data.kpis.ingredients), sub: `${data.kpis.estimatedCosts} need confirmation`, tone: data.kpis.estimatedCosts ? "warn" : "good" },
    { label: "Average menu FC", value: pct(data.kpis.averageFoodCostPct), sub: "using current POS prices", tone: (data.kpis.averageFoodCostPct ?? 0) > .55 ? "bad" : "default" },
    { label: "Missing prices", value: num(data.kpis.missingCosts), tone: data.kpis.missingCosts ? "bad" : "good" },
  ]
  return <>
    <PageHeader title="Recipe Costing" chips={["Live costs", "versioned recipes", "POS-linked margins"]} />
    <KpiStrip items={kpis} />
    <section className="mb-7">
      <SectionHead title="Menu costing" context="Current recipe revision × current POS price" />
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
        <table className="w-full text-[11.5px] leading-tight"><thead><tr className="border-b border-stone-200 bg-stone-50/80 text-[10.5px] uppercase tracking-wide text-stone-400">
          <th className="px-2.5 py-1.5 text-left">Recipe</th><th className="px-2.5 py-1.5 text-right">Plate cost</th><th className="px-2.5 py-1.5 text-right">Sell price</th><th className="px-2.5 py-1.5 text-right">FC %</th><th className="px-2.5 py-1.5 text-right">Margin</th><th className="px-2.5 py-1.5 text-right">Suggested @ target</th><th className="whitespace-nowrap px-2.5 py-[3px]">Status</th>
        </tr></thead><tbody className="divide-y divide-stone-100">{data.rows.map((row) => {
          const tone = row.flags.length || (row.foodCostPct ?? 0) > .75 ? "bad" : (row.foodCostPct ?? 0) > .55 ? "warn" : "ok"
          return <tr key={row.id} className="hover:bg-coral-50/60">
            <td className="whitespace-nowrap px-2.5 py-[3px]">{canEdit ? <Link href={`/h8/costing/recipes/${row.id}`} className="font-medium text-stone-900 hover:text-coral-700">{row.name}</Link> : <span className="font-medium text-stone-900">{row.name}</span>}<span className="ml-1.5 text-[10px] text-stone-400">v{row.version}</span></td>
            <td className="whitespace-nowrap px-2.5 py-[3px] text-right font-medium tabular-nums">{money(row.plateCost)}</td><td className="whitespace-nowrap px-2.5 py-[3px] text-right tabular-nums">{money(row.sellPrice)}</td>
            <td className="whitespace-nowrap px-2.5 py-[3px] text-right font-semibold tabular-nums">{pct(row.foodCostPct)}</td><td className={"whitespace-nowrap px-2.5 py-[3px] text-right tabular-nums " + ((row.margin ?? 0) < 0 ? "font-semibold text-red-600" : "text-stone-600")}>{money(row.margin)}</td>
            <td className={"whitespace-nowrap px-2.5 py-[3px] text-right tabular-nums " + ((row.sellPrice ?? 0) < (row.suggestedPrice ?? 0) ? "font-semibold text-coral-700" : "text-stone-400")}>{row.suggestedPrice == null ? "—" : money(Math.ceil(row.suggestedPrice / 10) * 10)}</td>
            <td className="whitespace-nowrap px-2.5 py-[3px]"><Badge tone={tone}>{row.flags.length ? "needs data" : (row.foodCostPct ?? 0) > .75 ? "critical" : (row.foodCostPct ?? 0) > .55 ? "high" : "ok"}</Badge></td>
          </tr>
        })}</tbody></table>
      </div>
    </section>
    <OilAllocationCard rate={data.fryingRate} canEdit={canEdit} />
  </>
}
