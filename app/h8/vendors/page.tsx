import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { listVendors } from "@/lib/inventory"

export const dynamic = "force-dynamic"

export default async function VendorsPage() {
  const vendors = await listVendors("h8")
  return (
    <>
      <PageHeader title="Vendors" subtitle={`${vendors.length} suppliers`} />
      <div className="mb-4">
        <Link href="/h8/vendors/new" className="px-4 py-2 bg-coral-600 text-white text-sm font-medium rounded-md hover:bg-coral-700">+ New vendor</Link>
      </div>
      {vendors.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-300 rounded-lg p-10 text-center text-stone-500">
          No vendors yet. Add your suppliers (vegetable man, meat supplier, drinks distributor…).
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Contact</th>
                <th className="px-3 py-2 text-left font-medium">Phone</th>
                <th className="px-3 py-2 text-left font-medium">Tax</th>
                <th className="px-3 py-2 text-left font-medium">Terms</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-stone-50">
                  <td className="px-3 py-2 font-medium">{v.name}</td>
                  <td className="px-3 py-2 text-stone-600">{v.contactPerson ?? "—"}</td>
                  <td className="px-3 py-2 text-stone-600">{v.whatsapp ?? v.phone ?? "—"}</td>
                  <td className="px-3 py-2">
                    {v.isSalesTaxRegistered
                      ? <span className="text-coral-600 text-xs">STRN {v.strn ?? "✓"}</span>
                      : <span className="text-stone-400 text-xs">Unregistered</span>}
                  </td>
                  <td className="px-3 py-2 text-stone-600 text-xs">{v.paymentTermsDays != null ? `Net ${v.paymentTermsDays}d` : "—"}</td>
                  <td className="px-3 py-2">{v.isActive ? <span className="text-coral-600 text-xs">Active</span> : <span className="text-stone-400 text-xs">Inactive</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
