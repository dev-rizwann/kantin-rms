import { PageHeader } from "@/components/PageHeader"
import { VendorForm } from "./VendorForm"

export const dynamic = "force-dynamic"

export default function NewVendorPage() {
  return (
    <>
      <PageHeader title="New vendor" subtitle="A supplier you receive goods from" />
      <VendorForm />
    </>
  )
}
