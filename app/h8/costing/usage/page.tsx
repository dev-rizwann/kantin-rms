import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { Badge, KpiStrip, SectionHead, type Kpi } from "@/components/ui"
import { money, num, pct } from "@/lib/format"
import { getTheoreticalUsage } from "@/lib/recipes"
import { canCurrent } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

function validDate(value: string | string[] | undefined): string | null { const s = Array.isArray(value) ? value[0] : value; return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null }
function iso(d: Date) { return d.toISOString().slice(0, 10) }
function usageQty(qty: number, uom: string) {
  if (uom === "GRAM" && qty >= 1000) return `${(qty / 1000).toLocaleString("en-PK", { maximumFractionDigits: 2 })} KG`
  if (uom === "ML" && qty >= 1000) return `${(qty / 1000).toLocaleString("en-PK", { maximumFractionDigits: 2 })} LITRE`
  return `${qty.toLocaleString("en-PK", { maximumFractionDigits: 2 })} ${uom}`
}

export default async function UsagePage({ searchParams }: { searchParams: { from?: string | string[]; to?: string | string[] } }) {
  const today = new Date(); const thirty = new Date(today); thirty.setDate(today.getDate() - 29)
  const to = validDate(searchParams.to) ?? iso(today)
  const from = validDate(searchParams.from) ?? iso(thirty)
  const [data, canEdit] = await Promise.all([getTheoreticalUsage("h8", from, to), canCurrent("recipe.edit", "h8")])
  const kpis: Kpi[] = [
    { label: "Mapped units", value: num(data.kpis.mappedUnits), sub: `${num(data.recipes.length)} recipes` },
    { label: "Mapped sales", value: money(data.kpis.sales, { compact: true }) },
    { label: "Theoretical COGS", value: money(data.kpis.theoreticalCogs, { compact: true }), sub: `${money(data.kpis.adjustmentCost)} allocated oil` },
    { label: "Food cost", value: pct(data.kpis.foodCostPct), tone: (data.kpis.foodCostPct ?? 0) > .55 ? "bad" : "default" },
    { label: "Unmapped units", value: num(data.kpis.unmappedUnits), tone: data.kpis.unmappedUnits ? "warn" : "good" },
  ]
  return <>
    <PageHeader title="Theoretical Usage" subtitle="Settled POS units × active recipe revisions, excluding voids, cancels, and refunds." />
    <form method="get" className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4"><div><label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-stone-400">From</label><input type="date" name="from" defaultValue={from} className="rounded-lg border border-stone-200 px-3 py-2 text-sm" /></div><div><label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-stone-400">To</label><input type="date" name="to" defaultValue={to} className="rounded-lg border border-stone-200 px-3 py-2 text-sm" /></div><button className="rounded-lg bg-coral-600 px-4 py-2 text-sm font-medium text-white">Run report</button><span className="ml-auto text-xs text-stone-400">{from} → {to}</span></form>
    <KpiStrip items={kpis} />
    <section className="mb-7"><SectionHead title="Raw-material requirement" context="Semi-finished recipes fully exploded" /><div className="overflow-x-auto rounded-xl border border-stone-200 bg-white"><table className="w-full text-[13px]"><thead><tr className="border-b border-stone-200 bg-stone-50/80 text-[10.5px] uppercase tracking-wide text-stone-400"><th className="px-3 py-2 text-left">Ingredient</th><th className="px-3 py-2 text-left">Category</th><th className="px-3 py-2 text-right">Theoretical quantity</th><th className="px-3 py-2 text-right">Unit cost</th><th className="px-3 py-2 text-right">Theoretical COGS</th><th className="px-3 py-2">Quality</th></tr></thead><tbody className="divide-y divide-stone-100">{data.ingredients.map((r) => <tr key={r.productId} className="hover:bg-coral-50/60"><td className="px-3 py-2 font-medium text-stone-900">{r.name}</td><td className="px-3 py-2 text-stone-400">{r.category}</td><td className="px-3 py-2 text-right tabular-nums">{usageQty(r.quantity, r.uomCode)}</td><td className="px-3 py-2 text-right tabular-nums">{r.unitCost == null ? "—" : `Rs ${r.unitCost.toFixed(4)}`}</td><td className="px-3 py-2 text-right font-medium tabular-nums">{money(r.totalCost)}</td><td className="px-3 py-2"><Badge tone={r.estimated ? "warn" : "ok"}>{r.estimated ? "confirm price" : "verified"}</Badge></td></tr>)}</tbody></table></div></section>
    <section className="mb-7"><SectionHead title="Recipe contribution" context="Sales-weighted, not one-of-each" /><div className="overflow-x-auto rounded-xl border border-stone-200 bg-white"><table className="w-full text-[13px]"><thead><tr className="border-b border-stone-200 bg-stone-50/80 text-[10.5px] uppercase tracking-wide text-stone-400"><th className="px-3 py-2 text-left">Recipe</th><th className="px-3 py-2 text-right">Units</th><th className="px-3 py-2 text-right">Sales</th><th className="px-3 py-2 text-right">Theoretical COGS</th><th className="px-3 py-2 text-right">FC %</th></tr></thead><tbody className="divide-y divide-stone-100">{data.recipes.map((r) => <tr key={r.recipeId} className="hover:bg-coral-50/60"><td className="px-3 py-2">{canEdit ? <Link href={`/h8/costing/recipes/${r.recipeId}`} className="font-medium text-stone-900 hover:text-coral-700">{r.name}</Link> : <span className="font-medium text-stone-900">{r.name}</span>}</td><td className="px-3 py-2 text-right tabular-nums">{num(r.units)}</td><td className="px-3 py-2 text-right tabular-nums">{money(r.sales)}</td><td className="px-3 py-2 text-right font-medium tabular-nums">{money(r.cogs)}</td><td className="px-3 py-2 text-right font-semibold tabular-nums">{pct(r.foodCostPct)}</td></tr>)}</tbody></table></div></section>
    {data.unmapped.length > 0 && <section><SectionHead title="Unmapped POS items" context="Add an alias before relying on complete usage" /><div className="overflow-x-auto rounded-xl border border-amber-200 bg-amber-50/30"><table className="w-full text-[13px]"><thead><tr className="border-b border-amber-200 text-[10.5px] uppercase tracking-wide text-amber-700"><th className="px-3 py-2 text-left">POS item</th><th className="px-3 py-2 text-left">Category</th><th className="px-3 py-2 text-right">Units</th><th className="px-3 py-2 text-right">Sales</th></tr></thead><tbody className="divide-y divide-amber-100">{data.unmapped.slice(0, 30).map((r) => <tr key={r.itemId}><td className="px-3 py-2 font-medium">{r.title}</td><td className="px-3 py-2 text-stone-500">{r.category ?? "—"}</td><td className="px-3 py-2 text-right tabular-nums">{num(r.units)}</td><td className="px-3 py-2 text-right tabular-nums">{money(r.sales)}</td></tr>)}</tbody></table></div></section>}
  </>
}
