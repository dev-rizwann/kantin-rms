import { PageHeader } from "@/components/PageHeader"

export default function StockTakePage() {
  return (
    <>
      <PageHeader
        title="Stock Take"
        subtitle="Physical inventory count. Compare counted quantity to expected, post variance."
      />
      <div className="bg-white border border-dashed border-slate-300 rounded-lg p-10 text-center">
        <div className="text-4xl mb-4">🧮</div>
        <h2 className="text-lg font-semibold text-slate-800">Stock take — coming next</h2>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">
          Workflow: start a stock-take session (snapshots expected qty per product) →
          counter enters physical count → manager reviews variances → approve, which posts
          adjustment movements.
        </p>
      </div>
    </>
  )
}
