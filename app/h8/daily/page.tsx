"use client"

import { Card, CardBody, CardHeader } from "@/components/Card"
import { MiniLineChart } from "@/components/Charts"
import { DataTable } from "@/components/DataTable"
import { PageHeader, Section } from "@/components/PageHeader"
import { dashboard } from "@/lib/data"
import { money, num, shortDate, shortDateTime, timeOnly } from "@/lib/format"

export default function DailyPage() {
  const { daily, sessions, daily_cancels_refunds, daily_payments } = dashboard

  // Roll up cancels/refunds per day for joining
  const exByDay: Record<string, { cancels: number; cancel_amt: number; refunds: number; refund_amt: number }> = {}
  for (const r of daily_cancels_refunds) {
    const d = (exByDay[r.sale_date] ??= { cancels: 0, cancel_amt: 0, refunds: 0, refund_amt: 0 })
    if (r.kind === "cancel") {
      d.cancels = r.count_
      d.cancel_amt = r.amount
    } else {
      d.refunds = r.count_
      d.refund_amt = r.amount
    }
  }

  // Roll up payment net per day for variance check
  const payByDay: Record<string, number> = {}
  for (const p of daily_payments) {
    payByDay[p.sale_date] = (payByDay[p.sale_date] ?? 0) + p.net_paid
  }

  const dailyRich = [...daily]
    .reverse()
    .map((d) => ({
      ...d,
      ...(exByDay[d.sale_date] ?? { cancels: 0, cancel_amt: 0, refunds: 0, refund_amt: 0 }),
      payments_net: payByDay[d.sale_date] ?? 0,
      variance: (payByDay[d.sale_date] ?? 0) - d.gross_total,
    }))

  // Z report = sessions grouped by date with totals
  const sessionRich = sessions.map((s) => ({
    ...s,
    duration_hours:
      s.close_time && s.open_time
        ? (new Date(s.close_time).getTime() - new Date(s.open_time).getTime()) / 36e5
        : null,
  }))

  return (
    <>
      <PageHeader title="Daily Sales / Z Report" subtitle="Day-by-day totals with variance check against payment receipts" />

      <Section title="30-day gross trend">
        <Card>
          <CardBody>
            <MiniLineChart data={[...daily].slice(-30)} xKey="sale_date" yKey="gross_total" height={240} />
          </CardBody>
        </Card>
      </Section>

      <Section title="Daily summary" right={<span className="text-xs text-slate-500">{daily.length} days</span>}>
        <DataTable
          rows={dailyRich}
          initialSort={{ key: "sale_date", dir: "desc" }}
          columns={[
            { key: "sale_date", header: "Date", render: (r) => shortDate(r.sale_date) },
            { key: "tickets", header: "Tickets", numeric: true, render: (r) => num(r.tickets) },
            { key: "gross_total", header: "Gross", numeric: true, render: (r) => money(r.gross_total) },
            { key: "payments_net", header: "Payments Net", numeric: true, render: (r) => money(r.payments_net) },
            {
              key: "variance",
              header: "Variance",
              numeric: true,
              render: (r) => (
                <span className={Math.abs(r.variance) > 1 ? "text-red-600 font-medium" : "text-slate-400"}>
                  {money(r.variance)}
                </span>
              ),
            },
            { key: "void_tickets", header: "Voids", numeric: true, render: (r) => (r.void_tickets ? num(r.void_tickets) : "—") },
            { key: "cancels", header: "Cancels", numeric: true, render: (r) => (r.cancels ? `${num(r.cancels)} (${money(r.cancel_amt, { compact: true })})` : "—") },
            { key: "refunds", header: "Refunds", numeric: true, render: (r) => (r.refunds ? `${num(r.refunds)} (${money(r.refund_amt, { compact: true })})` : "—") },
          ]}
        />
      </Section>

      <Section title="Z Report — cashier sessions (open & close)" right={<span className="text-xs text-slate-500">{sessions.length} sessions</span>}>
        <DataTable
          rows={sessionRich}
          initialSort={{ key: "open_time", dir: "desc" }}
          columns={[
            {
              key: "status",
              header: "Status",
              render: (r) =>
                r.status === "open" ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">OPEN</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">Closed</span>
                ),
            },
            { key: "session_id", header: "Session" },
            { key: "sale_date", header: "Date", render: (r) => shortDate(r.sale_date) },
            { key: "open_time", header: "Opened", render: (r) => `${timeOnly(r.open_time)} · ${r.opened_by ?? "—"}` },
            { key: "close_time", header: "Closed", render: (r) => (r.close_time ? `${timeOnly(r.close_time)} · ${r.closed_by ?? "—"}` : "—") },
            {
              key: "duration_hours",
              header: "Duration",
              numeric: true,
              render: (r) => (r.duration_hours ? r.duration_hours.toFixed(1) + "h" : "—"),
            },
            { key: "tickets", header: "Tickets", numeric: true, render: (r) => num(r.tickets) },
            { key: "gross_total", header: "Gross", numeric: true, render: (r) => money(r.gross_total) },
            { key: "petty_cash", header: "Petty Cash", numeric: true, render: (r) => money(r.petty_cash) },
          ]}
        />
      </Section>
    </>
  )
}
