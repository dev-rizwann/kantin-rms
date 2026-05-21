import { Card, CardBody, CardHeader } from "@/components/Card"
import { PageHeader, Section } from "@/components/PageHeader"
import { dashboard } from "@/lib/data"
import { money, num } from "@/lib/format"

export default function CatalogPage() {
  const { items, categories } = dashboard
  const byCat: Record<string, typeof items> = {}
  for (const i of items) {
    const k = i.category ?? "(uncategorized)"
    ;(byCat[k] ??= []).push(i)
  }
  const sortedCats = [...categories]
    .filter((c) => byCat[c.category])
    .sort((a, b) => b.total_sales - a.total_sales)

  return (
    <>
      <PageHeader title="Catalog" subtitle={`Menu listing — ${items.length} items across ${categories.length} categories`} />

      <Section title="">
        <div className="space-y-4">
          {sortedCats.map((c) => {
            const its = (byCat[c.category] ?? []).slice().sort((a, b) => a.item.localeCompare(b.item))
            return (
              <Card key={c.category_id}>
                <CardHeader title={c.category || "(uncategorized)"} sub={`${its.length} items`} />
                <CardBody className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left">ID</th>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-right">Price</th>
                        <th className="px-3 py-2 text-right">Takeaway</th>
                        <th className="px-3 py-2 text-right">Delivery</th>
                        <th className="px-3 py-2 text-right">Tax</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">On sale</th>
                        <th className="px-3 py-2 text-right">Qty sold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {its.map((it) => (
                        <tr key={it.item_id} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 tabular-nums text-slate-500">{it.item_id}</td>
                          <td className="px-3 py-1.5">{it.item}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{money(it.price)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{it.price_takeaway ? money(it.price_takeaway) : "—"}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{it.price_delivery ? money(it.price_delivery) : "—"}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{it.tax ? `${it.tax}%` : "—"}</td>
                          <td className="px-3 py-1.5">
                            {it.status === "Active" ? (
                              <span className="text-emerald-600">Active</span>
                            ) : (
                              <span className="text-slate-400">Inactive</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5">{it.on_sale}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{num(it.total_qty)}</td>
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
