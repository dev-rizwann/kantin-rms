import clsx from "clsx"
import { Card, CardBody, CardHeader } from "@/components/Card"
import { PageHeader } from "@/components/PageHeader"
import { dashboard } from "@/lib/data"
import { money, num, shortDate } from "@/lib/format"

export default function DuplicatesPage() {
  const { duplicates } = dashboard

  return (
    <>
      <PageHeader
        title="Duplicate items"
        subtitle={`${duplicates.length} groups detected. Match rule: fuzzy title (Levenshtein on tokens) + (same category OR same price). Items with the same name in different categories at different prices — e.g. Food panda markup vs in-store — are treated as intentional and NOT flagged.`}
      />

      {duplicates.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3 text-sm text-emerald-800">
          ✅ No duplicate groups detected under the current rule.
        </div>
      )}

      <div className="space-y-4">
        {duplicates.map((g, idx) => {
          const keep = g.items[0]
          const others = g.items.slice(1)
          const totalSales = g.items.reduce((s, it) => s + (it.total_sales ?? 0), 0)
          return (
            <Card key={idx}>
              <CardHeader
                title={`#${idx + 1} — ${g.group_key}`}
                sub={`confidence: ${g.confidence} (score ${g.score.toFixed(2)}) · ${g.items.length} items · combined sales ${money(totalSales)}`}
              />
              <CardBody className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Suggestion</th>
                      <th className="px-3 py-2 text-left font-medium">ID</th>
                      <th className="px-3 py-2 text-left font-medium">Item</th>
                      <th className="px-3 py-2 text-left font-medium">Category</th>
                      <th className="px-3 py-2 text-right font-medium">Price</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">Sales</th>
                      <th className="px-3 py-2 text-left font-medium">Last sold</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-emerald-50/60">
                      <td className="px-3 py-2 text-xs font-medium text-emerald-700 uppercase">Keep</td>
                      <td className="px-3 py-2 tabular-nums">{keep.item_id}</td>
                      <td className="px-3 py-2 font-medium">{keep.item}</td>
                      <td className="px-3 py-2 text-slate-600">{keep.category ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(keep.price)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{num(keep.total_qty)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{money(keep.total_sales)}</td>
                      <td className="px-3 py-2 text-slate-500">{shortDate(keep.last_sold)}</td>
                      <td className="px-3 py-2">{keep.status}</td>
                    </tr>
                    {others.map((it) => (
                      <tr key={it.item_id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-xs font-medium text-red-600 uppercase">Merge into "keep"</td>
                        <td className="px-3 py-2 tabular-nums">{it.item_id}</td>
                        <td className="px-3 py-2">{it.item}</td>
                        <td className="px-3 py-2 text-slate-600">{it.category ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(it.price)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{num(it.total_qty)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(it.total_sales)}</td>
                        <td className="px-3 py-2 text-slate-500">{shortDate(it.last_sold)}</td>
                        <td className="px-3 py-2">
                          <span className={clsx(it.status === "Active" ? "text-slate-600" : "text-slate-400")}>
                            {it.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )
        })}
      </div>

      <div className="mt-8 bg-slate-100 border border-slate-200 rounded-md px-4 py-3 text-xs text-slate-700">
        <strong>How to fix in POS:</strong> open the POS app on the original machine, edit the "merge into keep" item
        (rename it to match the keep item, or mark it Inactive), and going forward staff should only use the "keep" item.
        Old historical sales rows are not touched — they retain their original item references. Future reports will
        consolidate as the duplicates fall out of use.
      </div>
    </>
  )
}
