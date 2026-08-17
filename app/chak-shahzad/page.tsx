import { Card, CardBody, CardHeader } from "@/components/Card"
import { DonutChart, MiniLineChart, SimpleBarChart } from "@/components/Charts"
import { PageHeader } from "@/components/PageHeader"
import { KpiStrip, LedgerTable, SectionHead, type Kpi } from "@/components/ui"
import { money, num, shortDate } from "@/lib/format"
import { getH8OverviewLive } from "@/lib/h8-live"

export const dynamic = "force-dynamic"
const SLUG = "chak-shahzad"

export default async function ChakShahzadOverview() {
  const d = await getH8OverviewLive(SLUG)
  const { summary, meta, today } = d
  const avgTicket = summary.totalTickets ? summary.totalGross / summary.totalTickets : 0
  const deltaPct = today.prevGross > 0 ? ((today.gross - today.prevGross) / today.prevGross) * 100 : null
  const maxItemSales = Math.max(1, ...d.topItems30d.map((t) => t.sales))

  if (summary.totalTickets === 0) {
    return (
      <>
        <PageHeader title="Overview" />
        <div className="rounded-xl border border-dashed border-stone-250 bg-white px-6 py-16 text-center">
          <div className="text-sm font-medium text-stone-700">No sales have synced yet</div>
          <p className="mx-auto mt-2 max-w-md text-xs text-stone-500">
            The canteen PC pushes hourly. Once the first sync lands, this page fills in
            automatically — nothing further to set up.
          </p>
        </div>
      </>
    )
  }

  const kpis: Kpi[] = [
    {
      label: "Latest day", value: money(today.gross, { compact: true }),
      sub: deltaPct == null
        ? `${num(today.tickets)} tickets · ${shortDate(today.date)}`
        : `${deltaPct >= 0 ? "▲" : "▼"} ${Math.abs(deltaPct).toFixed(0)}% vs prev day · ${num(today.tickets)} tickets`,
      tone: deltaPct == null ? "default" : deltaPct >= 0 ? "good" : "bad",
    },
    { label: "Gross (all-time)", value: money(summary.totalGross, { compact: true }), sub: `${num(meta.daysWithSales)} selling days` },
    { label: "Tickets", value: num(summary.totalTickets), sub: `avg ${money(avgTicket)}` },
    { label: "Items sold", value: num(summary.itemsSold), sub: `${num(summary.distinctItemsSold)} distinct` },
    { label: "Voids", value: num(summary.voidTickets), tone: summary.voidTickets > 50 ? "warn" : "default" },
    {
      label: "Cancels / refunds", value: `${num(summary.totalCancels)} / ${num(summary.totalRefunds)}`,
      sub: money(summary.totalCancelAmount + summary.totalRefundAmount),
      tone: summary.totalCancels + summary.totalRefunds > 100 ? "warn" : "default",
    },
  ]

  return (
    <>
      <PageHeader title="Overview" />
      <KpiStrip items={kpis} />
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Daily gross" sub="last 30 selling days" />
          <CardBody><MiniLineChart data={d.daily} xKey="sale_date" yKey="gross_total" /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Payment mix" />
          <CardBody><DonutChart data={d.paymentMix} nameKey="payment_type" valueKey="net_paid" /></CardBody>
        </Card>
      </div>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top categories" sub="all-time sales" />
          <CardBody><SimpleBarChart data={d.topCategories} xKey="category" yKey="total_sales" showAllTicks maxTickChars={10} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Sales by hour" sub="peak-band signal" />
          <CardBody><SimpleBarChart data={d.hourly} xKey="hour_of_day" yKey="gross" xFormat="hour" showAllTicks /></CardBody>
        </Card>
      </div>
      <section>
        <SectionHead title="Top items" context="last 30 days" />
        <LedgerTable
          rows={d.topItems30d}
          rank
          empty="No sales in the last 30 days"
          cols={[
            { key: "item", header: "Item", render: (r) => <span className="font-medium text-stone-900">{r.item}</span> },
            { key: "cat", header: "Category", render: (r) => <span className="text-stone-400">{r.category ?? "—"}</span> },
            { key: "qty", header: "Qty", numeric: true, render: (r) => num(r.qty) },
            { key: "sales", header: "Sales", numeric: true, lead: true, render: (r) => money(r.sales), bar: (r) => r.sales / maxItemSales },
          ]}
        />
      </section>
    </>
  )
}
