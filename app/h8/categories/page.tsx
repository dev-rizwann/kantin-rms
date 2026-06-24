"use client"

import { Card, CardBody, CardHeader } from "@/components/Card"
import { DataTable } from "@/components/DataTable"
import { PageHeader, Section } from "@/components/PageHeader"
import { dashboard } from "@/lib/data"
import { money, num } from "@/lib/format"

export default function CategoriesPage() {
  const { categories, items } = dashboard

  const totalSales = categories.reduce((s, c) => s + c.total_sales, 0)
  const ranked = [...categories]
    .filter((c) => c.category.trim().length > 0)
    .sort((a, b) => b.total_sales - a.total_sales)

  // Items grouped by category (for drill-down style display)
  const itemsByCat: Record<string, typeof items> = {}
  for (const i of items) {
    const k = i.category ?? "(uncategorized)"
    ;(itemsByCat[k] ??= []).push(i)
  }

  return (
    <>
      <PageHeader title="Categories" subtitle={`${categories.length} categories, ${items.length} items`} />

      <Section title="Category leaderboard">
        <DataTable
          rows={ranked.map((c) => ({
            ...c,
            share: totalSales ? c.total_sales / totalSales : 0,
          }))}
          initialSort={{ key: "total_sales", dir: "desc" }}
          columns={[
            { key: "category", header: "Category", render: (r) => <span className="font-medium">{r.category}</span> },
            { key: "item_count", header: "Items", numeric: true, render: (r) => num(r.item_count) },
            { key: "total_qty", header: "Qty sold", numeric: true, render: (r) => num(r.total_qty) },
            { key: "total_sales", header: "Sales", numeric: true, render: (r) => money(r.total_sales) },
            {
              key: "share",
              header: "Share",
              numeric: true,
              render: (r) => (r.share * 100).toFixed(1) + "%",
            },
          ]}
        />
      </Section>

      <Section title="Items by category">
        <div className="space-y-4">
          {ranked.map((c) => {
            const its = (itemsByCat[c.category] ?? []).slice().sort((a, b) => b.total_sales - a.total_sales)
            return (
              <Card key={c.category_id}>
                <CardHeader
                  title={c.category}
                  sub={`${c.item_count} items · ${num(c.total_qty)} sold · ${money(c.total_sales)}`}
                />
                <CardBody className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-right">Price</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {its.map((it) => (
                        <tr key={it.item_id} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5">{it.item}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{money(it.price)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{num(it.total_qty)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{money(it.total_sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            )
          })}
        </div>
      </Section>
    </>
  )
}
