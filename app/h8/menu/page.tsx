import { PageHeader } from "@/components/PageHeader"
import { KpiStrip, LedgerTable, SectionHead, type Kpi } from "@/components/ui"
import { money, num, shortDate } from "@/lib/format"
import { getH8MenuLive } from "@/lib/h8-live"
import { ItemTable } from "./ItemTable"

export const dynamic = "force-dynamic"

export default async function MenuPage() {
  const d = await getH8MenuLive()
  const maxCatSales = Math.max(1, ...d.categories.map((c) => c.sales))

  const kpis: Kpi[] = [
    { label: "Items", value: num(d.kpis.totalItems), sub: `${num(d.kpis.activeItems)} active` },
    { label: "Units sold", value: num(d.kpis.totalQty) },
    { label: "Sales (all-time)", value: money(d.kpis.totalSales, { compact: true }) },
    { label: "Never sold", value: num(d.kpis.neverSold), tone: d.kpis.neverSold > 0 ? "warn" : "default" },
  ]

  return (
    <>
      <PageHeader
        title="Menu Performance"
        chips={["Live", `through ${shortDate(d.meta.lastSaleDate)}`, "what's selling and what isn't"]}
      />
      <KpiStrip items={kpis} />

      <section className="mb-6">
        <SectionHead title="Categories" context={`${d.categories.length} categories`} />
        <LedgerTable
          rows={d.categories}
          rank
          cols={[
            { key: "cat", header: "Category", render: (r) => <span className="font-medium text-stone-900">{r.category}</span> },
            { key: "items", header: "Items", numeric: true, muted: true, render: (r) => num(r.items) },
            { key: "qty", header: "Qty", numeric: true, render: (r) => num(r.qty) },
            { key: "sales", header: "Sales", numeric: true, lead: true, render: (r) => money(r.sales), bar: (r) => r.sales / maxCatSales },
          ]}
        />
      </section>

      <section>
        <SectionHead title="Items" context={`${d.items.length} items · search & filter`} />
        <ItemTable items={d.items} />
      </section>
    </>
  )
}
