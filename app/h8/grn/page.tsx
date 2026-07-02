import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { listGrns } from "@/lib/inventory"
import { pkr } from "@/lib/money"
import { shortDate } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function GrnListPage() {
  const grns = await listGrns("h8")
  return (
    <>
      <PageHeader title="Goods Receipt Notes" subtitle="Record incoming deliveries. Posting raises stock in the ledger." />
      <div className="mb-4">
        <Link href="/h8/grn/new" className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700">+ New GRN</Link>
      </div>
      {grns.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-300 rounded-lg p-10 text-center text-stone-500">
          No GRNs yet. Record your first delivery to bring stock in.
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">GRN #</th>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Vendor</th>
                <th className="px-3 py-2 text-right font-medium">Lines</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {grns.map((g) => (
                <tr key={g.id} className="hover:bg-stone-50">
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/h8/grn/${g.id}`} className="text-emerald-600 hover:underline">{g.grnNumber}</Link>
                  </td>
                  <td className="px-3 py-2">{shortDate(g.receivedAt.toISOString())}</td>
                  <td className="px-3 py-2">{g.vendor?.name ?? (g.isInformal ? "Cash market" : "—")}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{g._count.lines}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pkr(g.grandTotal as any)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${g.status === "POSTED" ? "bg-emerald-100 text-emerald-700" : g.status === "CANCELED" ? "bg-red-100 text-red-700" : "bg-stone-100 text-stone-600"}`}>{g.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
