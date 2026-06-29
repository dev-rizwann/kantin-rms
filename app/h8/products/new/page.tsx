import { PageHeader } from "@/components/PageHeader"
import { listActiveUoms } from "@/lib/inventory"
import { ProductForm } from "./ProductForm"

export const dynamic = "force-dynamic"

export default async function NewProductPage() {
  const uoms = await listActiveUoms()
  return (
    <>
      <PageHeader title="New product" subtitle="A raw material, packaging, or resale item you receive and stock" />
      <ProductForm uoms={uoms.map((u) => ({ code: u.code, name: u.name, dimension: u.dimension }))} />
    </>
  )
}
