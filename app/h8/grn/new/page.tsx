import { PageHeader } from "@/components/PageHeader"
import { listProducts, listVendors, listActiveUoms } from "@/lib/inventory"
import { GrnForm } from "./GrnForm"

export const dynamic = "force-dynamic"

export default async function NewGrnPage() {
  // 3 simple queries, sequential (kept light to avoid the multi-query RSC hang).
  const products = await listProducts("h8")
  const vendors = await listVendors("h8")
  const uoms = await listActiveUoms()

  return (
    <>
      <PageHeader title="New GRN" subtitle="Record a delivery. Enter the physical count for each item." />
      {products.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-300 rounded-lg p-10 text-center text-stone-500">
          You need at least one product before recording a GRN. <a href="/h8/products/new" className="text-emerald-600 hover:underline">Add a product first.</a>
        </div>
      ) : (
        <GrnForm
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            stockUomCode: p.stockUomCode ?? p.unit,
          }))}
          vendors={vendors.filter((v) => v.isActive).map((v) => ({ id: v.id, name: v.name }))}
          uoms={uoms.map((u) => ({ code: u.code, name: u.name }))}
        />
      )}
    </>
  )
}
