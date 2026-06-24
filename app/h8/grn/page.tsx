import { PageHeader } from "@/components/PageHeader"

export default function GrnPage() {
  return (
    <>
      <PageHeader
        title="Goods Receipt Notes (GRN)"
        subtitle="Record incoming stock from vendors. Each GRN updates raw-material stock and unit cost."
      />
      <div className="bg-white border border-dashed border-slate-300 rounded-lg p-10 text-center">
        <div className="text-4xl mb-4">📦</div>
        <h2 className="text-lg font-semibold text-slate-800">GRN entry — coming next</h2>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">
          The data model is in place. Build steps coming up: vendor + product management,
          then a "New GRN" form (vendor → line items with qty &amp; unit cost → post).
          Posting will create stock movements automatically.
        </p>
      </div>
    </>
  )
}
