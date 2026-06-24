import { KpiCard } from "@/components/KpiCard"
import { Card, CardBody, CardHeader } from "@/components/Card"
import { DonutChart, MiniLineChart, SimpleBarChart } from "@/components/Charts"
import { PageHeader, Section } from "@/components/PageHeader"
import { money, num, shortDate } from "@/lib/format"
import {
  getH8Categories,
  getH8Daily,
  getH8HourlyPattern,
  getH8Meta,
  getH8PaymentTypes,
  getH8Sessions,
  getH8Summary,
  getH8TopItems30d,
} from "@/lib/h8-data"

// Live page — pulls from Postgres on each request.
// `force-dynamic` skips build-time prerender (we don't have DATABASE_URL there).
// 60-second cache via React's cache() in lib/h8-data.ts deduplicates queries within one request.
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function OverviewPage() {
  const [summary, meta, daily, sessions, hourly, paymentTypes, categories, topItems] =
    await Promise.all([
      getH8Summary(),
      getH8Meta(),
      getH8Daily(),
      getH8Sessions(),
      getH8HourlyPattern(),
      getH8PaymentTypes(),
      getH8Categories(),
      getH8TopItems30d(),
    ])

  const avgTicket = summary.totalTickets ? summary.totalGross / summary.totalTickets : 0
  const recent = daily.slice(-30)
  const openSessions = sessions.filter((s) => s.status === "open")

  const topCategories = [...categories]
    .filter((c) => (c.category || "").trim().length > 0)
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 8)
    .map((c) => ({ category: c.category, total_sales: c.totalSales }))

  const paymentMix = paymentTypes
    .filter((p) => p.netPaid > 0)
    .slice(0, 6)
    .map((p) => ({ payment_type: p.paymentType, net_paid: p.netPaid }))

  const recentForChart = recent.map((d) => ({
    sale_date: d.saleDate,
    gross_total: d.grossTotal,
  }))

  const hourlyForChart = hourly.map((h) => ({
    hour_of_day: h.hourOfDay,
    gross: h.gross,
  }))

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={`All-time totals through ${shortDate(meta.lastSaleDate)} · ${summary.daysWithSales} days of sales · live from Postgres`}
      />

      {openSessions.length > 0 && (
        <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
          ⚠️ {openSessions.length} cashier{" "}
          {openSessions.length === 1 ? "session is" : "sessions are"} currently open.
          {openSessions[0] && (
            <>
              {" "}
              Latest: <strong>{openSessions[0].openedBy}</strong> opened{" "}
              {shortDate(openSessions[0].openTime)} ·{" "}
              {num(openSessions[0].tickets)} tickets ·{" "}
              {money(openSessions[0].grossTotal, { compact: true })}
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <KpiCard
          label="Gross Sales"
          value={money(summary.totalGross, { compact: true })}
          sub={`${num(summary.daysWithSales)} days`}
        />
        <KpiCard
          label="Tickets"
          value={num(summary.totalTickets)}
          sub={`avg ${money(avgTicket, { compact: true })}`}
        />
        <KpiCard
          label="Items Sold"
          value={num(summary.itemsSold)}
          sub={`${num(summary.distinctItemsSold)} distinct`}
        />
        <KpiCard
          label="Voids"
          value={num(summary.voidTickets)}
          sub={money(summary.voidGross)}
          tone={summary.voidTickets > 50 ? "warn" : "default"}
        />
        <KpiCard
          label="Cancels"
          value={num(summary.totalCancels)}
          sub={money(summary.totalCancelAmount)}
          tone={summary.totalCancels > 50 ? "warn" : "default"}
        />
        <KpiCard
          label="Refunds"
          value={num(summary.totalRefunds)}
          sub={money(summary.totalRefundAmount)}
          tone={summary.totalRefunds > 10 ? "warn" : "default"}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader title="Daily gross — last 30 days" />
          <CardBody>
            <MiniLineChart data={recentForChart} xKey="sale_date" yKey="gross_total" />
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
            <SimpleBarChart
              data={topCategories}
              xKey="category"
              yKey="total_sales"
              color="#10b981"
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Sales by hour" sub="all items, non-canceled" />
          <CardBody>
            <SimpleBarChart
              data={hourlyForChart}
              xKey="hour_of_day"
              yKey="gross"
              color="#f59e0b"
            />
          </CardBody>
        </Card>
      </div>

      <Section
        title="Top 10 items — last 30 days"
        right={
          <span className="text-xs text-slate-500">
            {topItems.length} of {summary.distinctItemsSold}
          </span>
        }
      >
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
              {topItems.slice(0, 10).map((r, i) => (
                <tr key={r.itemId} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{r.item}</td>
                  <td className="px-3 py-2 text-slate-600">{r.category ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{num(r.qty)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {money(r.sales)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Section>
    </>
  )
}
