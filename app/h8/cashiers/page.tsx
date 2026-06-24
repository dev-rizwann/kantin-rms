"use client"

import { Card, CardBody, CardHeader } from "@/components/Card"
import { DataTable } from "@/components/DataTable"
import { PageHeader, Section } from "@/components/PageHeader"
import { dashboard } from "@/lib/data"
import { money, num, shortDate } from "@/lib/format"

export default function CashiersPage() {
  const { cashiers, cashier_daily, cashier_payments } = dashboard

  return (
    <>
      <PageHeader title="Cashiers" subtitle={`${cashiers.length} cashiers with sales activity`} />

      <Section title="Cashier leaderboard">
        <DataTable
          rows={cashiers.map((c) => ({
            ...c,
            avg_ticket: c.tickets ? c.gross_total / c.tickets : 0,
          }))}
          initialSort={{ key: "gross_total", dir: "desc" }}
          columns={[
            { key: "cashier", header: "Cashier", render: (r) => <span className="font-medium">{r.cashier}</span> },
            { key: "tickets", header: "Tickets", numeric: true, render: (r) => num(r.tickets) },
            { key: "gross_total", header: "Gross", numeric: true, render: (r) => money(r.gross_total) },
            { key: "avg_ticket", header: "Avg ticket", numeric: true, render: (r) => money(r.avg_ticket) },
            { key: "days_worked", header: "Days", numeric: true, render: (r) => num(r.days_worked) },
            { key: "first_ticket", header: "First", render: (r) => shortDate(r.first_ticket) },
            { key: "last_ticket", header: "Last", render: (r) => shortDate(r.last_ticket) },
          ]}
        />
      </Section>

      {cashiers.map((c) => {
        const daily = cashier_daily.filter((d) => d.cashier_id === c.cashier_id)
        const payments = cashier_payments.filter((p) => p.cashier_id === c.cashier_id && p.net_paid > 0)
        if (daily.length === 0 && payments.length === 0) return null
        return (
          <Section key={c.cashier_id} title={c.cashier}>
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader title="Daily activity" sub={`${daily.length} days`} />
                <CardBody className="p-0">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-right">Tickets</th>
                          <th className="px-3 py-2 text-right">Gross</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {daily.map((d, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5">{shortDate(d.sale_date)}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{num(d.tickets)}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{money(d.gross_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Payment mix" sub={`${payments.length} types used`} />
                <CardBody className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-right">Count</th>
                        <th className="px-3 py-2 text-right">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5">{p.payment_type}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{num(p.payment_count)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{money(p.net_paid)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            </div>
          </Section>
        )
      })}
    </>
  )
}
