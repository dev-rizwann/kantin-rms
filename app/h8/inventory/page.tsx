import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { getStockOnHand } from "@/lib/inventory"
import { pkr, qtyFmt } from "@/lib/money"

export const dynamic = "force-dynamic"

export default async function InventoryPage() {
  const rows = await getStockOnHand("h8")
  const totalValue = rows.reduce((s, r) => s + (r.avgCost ? r.onHand * r.avgCost : 0), 0)
  const low = rows.filter((r) => r.minStock > 0 && r.onHand <= r.minStock)

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle={`${rows.length} products · on-hand from the movement ledger (SUM of all stock movements)`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Products" value={String(rows.length)} />
        <Stat label="Low / out of stock" value={String(low.length)} tone={low.length ? "warn" : "ok"} />
        <Stat label="Stock value (avg cost)" value={pkr(totalValue)} />
        <Stat label="Tracked units" value={String(new Set(rows.map((r) => r.stockUomCode)).size)} />
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-300 rounded-lg p-10 text-center">
          <div className="text-4xl mb-3">🏷️</div>
          <h2 className="text-lg font-semibold text-stone-800">No products yet</h2>
          <p className="text-stone-500 mt-2 max-w-md mx-auto">
            Add your raw materials (potato, oil, cheese, buns…), then record a GRN to bring stock in.
          </p>
          <div className="mt-4 flex gap-3 justify-center">
            <Link href="/h8/products/new" className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700">+ Add product</Link>
            <Link href="/h8/grn/new" className="px-4 py-2 border border-stone-300 text-sm font-medium rounded-md hover:bg-stone-50">Record GRN</Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <div className="text-sm font-semibold text-stone-800">On-hand stock</div>
            <Link href="/h8/products/new" className="text-xs text-emerald-600 hover:underline">+ Add product</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Product</th>
                <th className="px-3 py-2 text-left font-medium">Kind</th>
                <th className="px-3 py-2 text-right font-medium">On hand</th>
                <th className="px-3 py-2 text-left font-medium">Unit</th>
                <th className="px-3 py-2 text-right font-medium">Min</th>
                <th className="px-3 py-2 text-right font-medium">Avg cost</th>
                <th className="px-3 py-2 text-right font-medium">Value</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((r) => {
                const isLow = r.minStock > 0 && r.onHand <= r.minStock
                const isNeg = r.onHand < 0
                return (
                  <tr key={r.productId} className="hover:bg-stone-50">
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2 text-stone-500 text-xs">{r.kind}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-medium ${isNeg ? "text-red-600" : ""}`}>{qtyFmt(r.onHand)}</td>
                    <td className="px-3 py-2 text-stone-500">{r.stockUomCode ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-stone-500">{r.minStock ? qtyFmt(r.minStock) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.avgCost ? pkr(r.avgCost, 2) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.avgCost ? pkr(r.onHand * r.avgCost) : "—"}</td>
                    <td className="px-3 py-2">
                      {isNeg ? <Badge tone="bad">Negative</Badge> : isLow ? <Badge tone="warn">Low</Badge> : <Badge tone="ok">OK</Badge>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className={`bg-white border rounded-lg p-4 shadow-sm ${tone === "warn" ? "border-amber-200" : "border-stone-200"}`}>
      <div className="text-xs uppercase tracking-wide text-stone-500 font-medium">{label}</div>
      <div className="text-2xl font-bold text-stone-900 mt-1">{value}</div>
    </div>
  )
}

function Badge({ tone, children }: { tone: "ok" | "warn" | "bad"; children: React.ReactNode }) {
  const cls = tone === "bad" ? "bg-red-100 text-red-700" : tone === "warn" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{children}</span>
}
