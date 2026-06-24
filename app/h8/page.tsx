import { KpiCard } from "@/components/KpiCard"
import { Card, CardBody, CardHeader } from "@/components/Card"
import { DonutChart, MiniLineChart, SimpleBarChart } from "@/components/Charts"
import { PageHeader, Section } from "@/components/PageHeader"
import { dashboard } from "@/lib/data"
import { money, num, shortDate } from "@/lib/format"

export default function OverviewPage() {
  const { summary, daily, top_items_30d, categories, payment_types, hourly_pattern, sessions, duplicates } = dashboard

  const avgTicket = summary.total_tickets ? summary.total_gross / summary.total_tickets : 0
  const recent = daily.slice(-30)
  const openSessions = sessions.filter((s) => s.status === "open")

  // Category bar chart data sorted by sales
  const topCategories = [...categories]
    .filter((c) => (c.category || "").trim().length > 0)
    .sort((a, b) => b.total_sales - a.total_sales)
    .slice(0, 8)

  // Donut for active payment types
  const paymentMix = payment_types.filter((p) => p.net_paid > 0).slice(0, 6)

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={`All-time totals through ${shortDate(dashboard.meta.last_sale_date)} · ${summary.days_with_sales} days of sales`}
      />

      {openSessions.length > 0 && (
        <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
          ⚠️ {openSessions.length} cashier {openSessions.length === 1 ? "session is" : "sessions are"} currently open.
          {openSessions[0] && (
            <>
              {" "}Latest: <strong>{openSessions[0].opened_by}</strong> opened {shortDate(openSessions[0].open_time)} ·
              {" "}{num(openSessions[0].tickets)} tickets · {money(openSessions[0].gross_total, { compact: true })}
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <KpiCard label="Gross Sales" value={money(summary.total_gross, { compact: true })} sub={`${num(summary.days_with_sales)} days`} />
        <KpiCard label="Tickets" value={num(summary.total_tickets)} sub={`avg ${money(avgTicket, { compact: true })}`} />
        <KpiCard label="Items Sold" value={num(summary.items_sold)} sub={`${num(summary.distinct_items_sold)} distinct`} />
        <KpiCard label="Voids" value={num(summary.void_tickets)} sub={money(summary.void_gross)} tone={summary.void_tickets > 50 ? "warn" : "default"} />
        <KpiCard label="Cancels" value={num(summary.total_cancels)} sub={money(summary.total_cancel_amount)} tone={summary.total_cancels > 50 ? "warn" : "default"} />
        <KpiCard label="Refunds" value={num(summary.total_refunds)} sub={money(summary.total_refund_amount)} tone={summary.total_refunds > 10 ? "warn" : "default"} />
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
            <SimpleBarChart data={hourly_pattern} xKey="hour_of_day" yKey="gross" color="#f59e0b" />
          </CardBody>
        </Card>
      </div>

      <Section title="Top 10 items — last 30 days" right={<span className="text-xs text-slate-500">{top_items_30d.length} of {summary.distinct_items_sold}</span>}>
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
              {top_items_30d.slice(0, 10).map((r, i) => (
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

      {duplicates.length > 0 && (
        <Section title="Duplicate items detected" right={<a href="/h8/duplicates" className="text-xs text-blue-600 hover:underline">View all →</a>}>
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-900">
            🔍 <strong>{duplicates.length} groups</strong> of likely-duplicate menu items found.
            See the Duplicates page for the full list with merge suggestions.
          </div>
        </Section>
      )}
    </>
  )
}
