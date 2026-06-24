"use client"

import { Card, CardBody, CardHeader } from "@/components/Card"
import { DonutChart, SimpleBarChart } from "@/components/Charts"
import { DataTable } from "@/components/DataTable"
import { PageHeader, Section } from "@/components/PageHeader"
import { dashboard } from "@/lib/data"
import { money, num, shortDate } from "@/lib/format"

export default function PaymentsPage() {
  const { payment_types, daily_payments } = dashboard

  const active = payment_types.filter((p) => p.net_paid > 0)

  // Group daily payments by date so we can show a stacked summary table
  const byDate: Record<string, Record<string, number>> = {}
  for (const r of daily_payments) {
    ;(byDate[r.sale_date] ??= {})[r.payment_type] = r.net_paid
  }
  const types = Array.from(new Set(daily_payments.map((r) => r.payment_type))).sort()
  const dateRows = Object.entries(byDate)
    .map(([sale_date, byType]) => {
      const total = Object.values(byType).reduce((s, n) => s + n, 0)
      return { sale_date, ...byType, total } as any
    })
    .sort((a, b) => (a.sale_date < b.sale_date ? 1 : -1))

  return (
    <>
      <PageHeader title="Payment Types" subtitle={`${active.length} active types, ${payment_types.length} total`} />

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader title="Net paid by type" sub="all-time" />
          <CardBody>
            <SimpleBarChart data={active} xKey="payment_type" yKey="net_paid" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Mix" />
          <CardBody>
            <DonutChart data={active} nameKey="payment_type" valueKey="net_paid" />
          </CardBody>
        </Card>
      </div>

      <Section title="Payment types — totals">
        <DataTable
          rows={payment_types}
          initialSort={{ key: "net_paid", dir: "desc" }}
          columns={[
            { key: "payment_type", header: "Type", render: (r) => <span className="font-medium">{r.payment_type}</span> },
            { key: "status", header: "Status" },
            { key: "payment_count", header: "Count", numeric: true, render: (r) => num(r.payment_count) },
            { key: "tendered", header: "Tendered", numeric: true, render: (r) => money(r.tendered) },
            { key: "change_due", header: "Change given", numeric: true, render: (r) => money(r.change_due) },
            { key: "net_paid", header: "Net", numeric: true, render: (r) => money(r.net_paid) },
          ]}
        />
      </Section>

      <Section title="Daily payment breakdown (per type)">
        <Card>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  {types.map((t) => (
                    <th key={t} className="px-3 py-2 text-right font-medium">
                      {t}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium bg-slate-100">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dateRows.map((r) => (
                  <tr key={r.sale_date} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 whitespace-nowrap">{shortDate(r.sale_date)}</td>
                    {types.map((t) => (
                      <td key={t} className="px-3 py-1.5 text-right tabular-nums">
                        {r[t] ? money(r[t], { compact: true }) : "—"}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium bg-slate-50">
                      {money(r.total, { compact: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>
    </>
  )
}
