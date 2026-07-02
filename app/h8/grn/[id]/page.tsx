import Link from "next/link"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/PageHeader"
import { getGrn } from "@/lib/inventory"
import { pkr, qtyFmt } from "@/lib/money"
import { shortDateTime } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function GrnDetailPage({ params }: { params: { id: string } }) {
  const grn = await getGrn("h8", params.id)
  if (!grn) notFound()

  return (
    <>
      <PageHeader
        title={grn.grnNumber}
        subtitle={`${grn.vendor?.name ?? (grn.isInformal ? "Cash market" : "No vendor")} · received ${shortDateTime(grn.receivedAt.toISOString())}`}
      />

      <div className="mb-4 flex items-center gap-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${grn.status === "POSTED" ? "bg-leaf-100 text-leaf-800" : "bg-stone-100 text-stone-600"}`}>{grn.status}</span>
        {grn.invoiceRef && <span className="text-sm text-stone-500">Invoice: {grn.invoiceRef}</span>}
        <Link href="/h8/grn" className="text-sm text-coral-600 hover:underline ml-auto">← All GRNs</Link>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Product</th>
              <th className="px-3 py-2 text-right font-medium">Received</th>
              <th className="px-3 py-2 text-left font-medium">Unit</th>
              <th className="px-3 py-2 text-right font-medium">→ Stock qty</th>
              <th className="px-3 py-2 text-right font-medium">Rejected</th>
              <th className="px-3 py-2 text-right font-medium">Unit cost</th>
              <th className="px-3 py-2 text-right font-medium">Tax</th>
              <th className="px-3 py-2 text-right font-medium">Line total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {grn.lines.map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-2 font-medium">{l.product.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{qtyFmt(l.qty as any)}</td>
                <td className="px-3 py-2">{l.uomCode}</td>
                <td className="px-3 py-2 text-right tabular-nums text-stone-600">{qtyFmt(l.qtyInStockUom as any)} {l.product.stockUomCode}</td>
                <td className="px-3 py-2 text-right tabular-nums">{qtyFmt(l.rejectedQty as any)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{pkr(l.unitCost as any, 2)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{pkr(l.taxAmount as any)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{pkr(l.lineTotal as any)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-stone-50 text-sm">
            <tr><td colSpan={7} className="px-3 py-1.5 text-right text-stone-500">Subtotal</td><td className="px-3 py-1.5 text-right tabular-nums">{pkr(grn.subtotal as any)}</td></tr>
            <tr><td colSpan={7} className="px-3 py-1.5 text-right text-stone-500">Tax</td><td className="px-3 py-1.5 text-right tabular-nums">{pkr(grn.taxTotal as any)}</td></tr>
            <tr><td colSpan={7} className="px-3 py-2 text-right font-semibold">Grand total</td><td className="px-3 py-2 text-right tabular-nums font-semibold">{pkr(grn.grandTotal as any)}</td></tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-stone-400">
        Posted GRNs are immutable. To correct, post an adjustment or a purchase return (Phase 6) — the ledger is never edited.
      </p>
    </>
  )
}
