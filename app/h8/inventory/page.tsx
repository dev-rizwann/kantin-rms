import { PageHeader } from "@/components/PageHeader"

export default function InventoryPage() {
  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Raw materials and packaging. Current stock is computed from the movement ledger."
      />
      <div className="bg-white border border-dashed border-slate-300 rounded-lg p-10 text-center">
        <div className="text-4xl mb-4">🏷️</div>
        <h2 className="text-lg font-semibold text-slate-800">Inventory — coming next</h2>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">
          Will list each product with on-hand quantity, min-stock alerts, last cost, last
          received date, and recent movements. Add/edit products from here.
        </p>
      </div>
    </>
  )
}
