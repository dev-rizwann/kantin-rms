"use client"

import { DataTable } from "@/components/DataTable"
import { KpiCard } from "@/components/KpiCard"
import { PageHeader, Section } from "@/components/PageHeader"
import { dashboard } from "@/lib/data"
import { money, num, shortDate } from "@/lib/format"

export default function CustomersPage() {
  const { customers, summary } = dashboard
  const named = customers.filter((c) => c.customer_id !== 0)
  const walkIn = customers.find((c) => c.customer_id === 0)

  return (
    <>
      <PageHeader title="Customers" subtitle="All-time sales per customer" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Walk-in tickets" value={num(walkIn?.tickets ?? 0)} sub={money(walkIn?.gross_total ?? 0, { compact: true })} />
        <KpiCard label="Named customers" value={num(named.length)} sub={`${num(summary.total_customers)} in DB`} />
        <KpiCard
          label="Named ticket count"
          value={num(named.reduce((s, c) => s + c.tickets, 0))}
        />
        <KpiCard
          label="Named gross"
          value={money(named.reduce((s, c) => s + c.gross_total, 0), { compact: true })}
        />
      </div>

      <Section title="Customers (named first, walk-in last)">
        <DataTable
          rows={[...named.sort((a, b) => b.gross_total - a.gross_total), ...(walkIn ? [walkIn] : [])]}
          search
          searchKeys={["customer"]}
          columns={[
            { key: "customer", header: "Customer", render: (r) => <span className="font-medium">{r.customer}</span> },
            { key: "tickets", header: "Tickets", numeric: true, render: (r) => num(r.tickets) },
            { key: "gross_total", header: "Gross", numeric: true, render: (r) => money(r.gross_total) },
            {
              key: "avg",
              header: "Avg ticket",
              numeric: true,
              sortValue: (r) => r.tickets ? r.gross_total / r.tickets : 0,
              render: (r) => money(r.tickets ? r.gross_total / r.tickets : 0),
            },
            { key: "first_visit", header: "First visit", render: (r) => shortDate(r.first_visit) },
            { key: "last_visit", header: "Last visit", render: (r) => shortDate(r.last_visit) },
          ]}
        />
      </Section>
    </>
  )
}
