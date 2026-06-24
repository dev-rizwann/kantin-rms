"use client"

import { useMemo, useState } from "react"
import { Card, CardBody, CardHeader } from "@/components/Card"
import { DataTable } from "@/components/DataTable"
import { KpiCard } from "@/components/KpiCard"
import { PageHeader } from "@/components/PageHeader"
import { dashboard } from "@/lib/data"
import { money, num, shortDate } from "@/lib/format"

export default function ItemsPage() {
  const { items, categories } = dashboard
  const [category, setCategory] = useState<string>("")

  const filtered = useMemo(() => {
    if (!category) return items
    return items.filter((i) => i.category === category)
  }, [items, category])

  const totalSales = filtered.reduce((s, i) => s + i.total_sales, 0)
  const totalQty = filtered.reduce((s, i) => s + i.total_qty, 0)
  const neverSold = filtered.filter((i) => i.total_qty === 0).length

  const categoryOptions = ["", ...categories.map((c) => c.category).filter((c) => c.trim().length > 0)]

  return (
    <>
      <PageHeader title="Items" subtitle="Per-item sales since the beginning, sortable & searchable" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label={category ? `${category} items` : "All items"} value={num(filtered.length)} />
        <KpiCard label="Total qty" value={num(totalQty)} />
        <KpiCard label="Total sales" value={money(totalSales, { compact: true })} />
        <KpiCard label="Never sold" value={num(neverSold)} tone={neverSold > 0 ? "warn" : "default"} />
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium text-slate-700">Category:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-md text-sm bg-white"
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c || "All categories"}
                </option>
              ))}
            </select>
          </div>
        </CardBody>
      </Card>

      <DataTable
        rows={filtered}
        search
        searchKeys={["item", "category", "barcode"]}
        initialSort={{ key: "total_sales", dir: "desc" }}
        columns={[
          { key: "item", header: "Item", render: (r) => <span className="font-medium">{r.item}</span> },
          { key: "category", header: "Category", render: (r) => r.category ?? "—" },
          { key: "price", header: "Price", numeric: true, render: (r) => money(r.price) },
          { key: "total_qty", header: "Qty", numeric: true, render: (r) => num(r.total_qty) },
          { key: "total_sales", header: "Sales", numeric: true, render: (r) => money(r.total_sales) },
          {
            key: "cancel_qty",
            header: "Cancels",
            numeric: true,
            render: (r) => (r.cancel_qty ? <span className="text-red-600">{num(r.cancel_qty)}</span> : "—"),
          },
          { key: "last_sold", header: "Last sold", render: (r) => shortDate(r.last_sold) },
          {
            key: "status",
            header: "Status",
            render: (r) =>
              r.status === "Active" ? (
                <span className="text-emerald-600">{r.status}</span>
              ) : (
                <span className="text-slate-400">{r.status}</span>
              ),
          },
        ]}
      />
    </>
  )
}
