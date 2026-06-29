import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { listProducts } from "@/lib/inventory"
import { qtyFmt, pkr } from "@/lib/money"

export const dynamic = "force-dynamic"

export default async function ProductsPage() {
  const products = await listProducts("h8")
  return (
    <>
      <PageHeader title="Products" subtitle={`${products.length} raw materials / packaging / resale items`} />
      <div className="mb-4">
        <Link href="/h8/products/new" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">+ New product</Link>
      </div>
      {products.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-lg p-10 text-center text-slate-500">
          No products yet. Add your first raw material to start recording GRNs.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Kind</th>
                <th className="px-3 py-2 text-left font-medium">Stock unit</th>
                <th className="px-3 py-2 text-right font-medium">Min stock</th>
                <th className="px-3 py-2 text-right font-medium">Avg cost</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{p.kind}</td>
                  <td className="px-3 py-2">{p.stockUomCode ?? p.unit}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{qtyFmt(p.minStock as any)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.avgCost ? pkr(p.avgCost as any, 2) : "—"}</td>
                  <td className="px-3 py-2">{p.isActive ? <span className="text-emerald-600 text-xs">Active</span> : <span className="text-slate-400 text-xs">Inactive</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
