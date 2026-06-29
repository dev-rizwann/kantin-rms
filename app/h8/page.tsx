import { KpiCard } from "@/components/KpiCard"
import { Card, CardBody, CardHeader } from "@/components/Card"
import { DonutChart, MiniLineChart, SimpleBarChart } from "@/components/Charts"
import { PageHeader, Section } from "@/components/PageHeader"
import { money, num, shortDate } from "@/lib/format"
import { getH8OverviewLive } from "@/lib/h8-live"

// Live from Postgres via ONE combined query (one round-trip — avoids the
// multi-query RSC hang). Reflects the latest synced POS data.
export const dynamic = "force-dynamic"

export default async function OverviewPage() {
  const d = await getH8OverviewLive()
  const { summary, meta } = d

  const avgTicket = summary.totalTickets ? summary.totalGross / summary.totalTickets : 0
  const recent = d.daily // already last-30 ascending
  const topCategories = d.topCategories.map((c) => ({ category: c.category, total_sales: c.total_sales }))
  const paymentMix = d.paymentMix.map((p) => ({ payment_type: p.payment_type, net_paid: p.net_paid }))
  const hourly = d.hourly.map((h) => ({ hour_of_day: h.hour_of_day, gross: h.gross }))

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={`All-time totals through ${shortDate(meta.lastSaleDate)} · ${meta.daysWithSales} days of sales · live`}
      />

      {d.openSessions.length > 0 && (
        <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
          ⚠️ {d.openSessions.length} cashier {d.openSessions.length === 1 ? "session is" : "sessions are"} currently open.
          {d.openSessions[0] && (
            <>
              {" "}Latest: <strong>{d.openSessions[0].opened_by}</strong> opened {shortDate(d.openSessions[0].open_time)} ·
              {" "}{num(d.openSessions[0].tickets)} tickets · {money(d.openSessions[0].gross_total, { compact: true })}
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <KpiCard label="Gross Sales" value={money(summary.totalGross, { compact: true })} sub={`${num(meta.daysWithSales)} days`} />
        <KpiCard label="Tickets" value={num(summary.totalTickets)} sub={`avg ${money(avgTicket, { compact: true })}`} />
        <KpiCard label="Items Sold" value={num(summary.itemsSold)} sub={`${num(summary.distinctItemsSold)} distinct`} />
        <KpiCard label="Voids" value={num(summary.voidTickets)} sub={money(summary.voidGross)} tone={summary.voidTickets > 50 ? "warn" : "default"} />
        <KpiCard label="Cancels" value={num(summary.totalCancels)} sub={money(summary.totalCancelAmount)} tone={summary.totalCancels > 50 ? "warn" : "default"} />
        <KpiCard label="Refunds" value={num(summary.totalRefunds)} sub={money(summary.totalRefundAmount)} tone={summary.totalRefunds > 10 ? "warn" : "default"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader title="Daily gross — last 30 days" />
          <CardBody>
            <MiniLineChart data={recent} xKey="sale_date" yKey="gross_total" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Payment mix" />
          <CardBody>
            <DonutChart data={paymentMix} nameKey="payment_type" valueKey="net_paid" />
          </CardBody>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader title="Top categories by sales" sub="all-time" />
          <CardBody>
            <SimpleBarChart data={topCategories} xKey="category" yKey="total_sales" color="#10b981" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Sales by hour" sub="all items, non-canceled" />
          <CardBody>
            <SimpleBarChart data={hourly} xKey="hour_of_day" yKey="gross" color="#f59e0b" />
          </CardBody>
        </Card>
      </div>

      <Section title="Top 10 items — last 30 days" right={<span className="text-xs text-slate-500">{d.topItems30d.length} of {summary.distinctItemsSold}</span>}>
        <Card>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Item</th>
                <th className="px-3 py-2 text-left font-medium">Category</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.topItems30d.map((r, i) => (
                <tr key={r.item_id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{r.item}</td>
                  <td className="px-3 py-2 text-slate-600">{r.category ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{num(r.qty)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{money(r.sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Section>
    </>
  )
}
