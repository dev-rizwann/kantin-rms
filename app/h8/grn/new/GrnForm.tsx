"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { postGrn } from "../../actions"

interface Product { id: string; name: string; stockUomCode: string }
interface Vendor { id: string; name: string }
interface Uom { code: string; name: string }

interface Line {
  productId: string
  uomCode: string
  receivedQty: string // BLANK by default — forces a real count
  rejectedQty: string
  unitCost: string
  taxRatePct: string
}

function blankLine(): Line {
  return { productId: "", uomCode: "", receivedQty: "", rejectedQty: "", unitCost: "", taxRatePct: "" }
}

export function GrnForm({ products, vendors, uoms }: { products: Product[]; vendors: Vendor[]; uoms: Uom[] }) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const [vendorId, setVendorId] = useState("")
  const [isInformal, setIsInformal] = useState(false)
  const [receivedAt, setReceivedAt] = useState(today)
  const [invoiceRef, setInvoiceRef] = useState("")
  const [hasGst, setHasGst] = useState(false)
  const [lines, setLines] = useState<Line[]>([blankLine()])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  function setLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  }
  function onPickProduct(i: number, productId: string) {
    const p = productById.get(productId)
    setLine(i, { productId, uomCode: p?.stockUomCode ?? "" }) // default unit = stock unit
  }

  const missingCount = lines.filter((l) => l.productId && !(parseFloat(l.receivedQty) > 0)).length
  const grandTotal = lines.reduce((s, l) => {
    const q = parseFloat(l.receivedQty) || 0
    const c = parseFloat(l.unitCost) || 0
    const t = hasGst ? parseFloat(l.taxRatePct) || 0 : 0
    const lt = q * c
    return s + lt + (lt * t) / 100
  }, 0)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const usable = lines.filter((l) => l.productId)
    if (usable.length === 0) { setError("Add at least one line"); return }
    if (missingCount > 0) { setError(`${missingCount} line(s) missing received qty — enter the physical count`); return }
    setBusy(true)
    const res = await postGrn({
      vendorId: vendorId || null,
      receivedAt,
      invoiceRef: invoiceRef || undefined,
      isInformal,
      lines: usable.map((l) => ({
        productId: l.productId,
        uomCode: l.uomCode,
        receivedQty: parseFloat(l.receivedQty),
        rejectedQty: l.rejectedQty ? parseFloat(l.rejectedQty) : 0,
        unitCost: parseFloat(l.unitCost) || 0,
        taxRatePct: hasGst ? parseFloat(l.taxRatePct) || 0 : 0,
      })),
    })
    setBusy(false)
    if (!res.ok) { setError(res.error ?? "Failed to post"); return }
    router.push(`/h8/grn/${res.data!.id}`)
    router.refresh()
  }

  const input = "px-3 py-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-4 pb-24">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
          <select className={input + " w-full"} value={vendorId} onChange={(e) => setVendorId(e.target.value)} disabled={isInformal}>
            <option value="">— select vendor —</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs text-slate-600 mt-2">
            <input type="checkbox" checked={isInformal} onChange={(e) => { setIsInformal(e.target.checked); if (e.target.checked) setVendorId("") }} />
            Cash-market / informal (no formal vendor or invoice)
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Received date</label>
            <input type="date" max={today} className={input + " w-full"} value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice ref</label>
            <input className={input + " w-full"} value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="optional" disabled={isInformal} />
          </div>
          <label className="col-span-2 flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={hasGst} onChange={(e) => setHasGst(e.target.checked)} disabled={isInformal} />
            Invoice has GST (show per-line tax)
          </label>
        </div>
      </div>

      {/* Lines */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-800">Items received</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-2 py-2 text-left font-medium min-w-[180px]">Product</th>
                <th className="px-2 py-2 text-left font-medium">Unit</th>
                <th className="px-2 py-2 text-left font-medium">Received qty *</th>
                <th className="px-2 py-2 text-left font-medium">Rejected</th>
                <th className="px-2 py-2 text-left font-medium">Unit cost</th>
                {hasGst && <th className="px-2 py-2 text-left font-medium">GST %</th>}
                <th className="px-2 py-2 text-right font-medium">Line total</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((l, i) => {
                const q = parseFloat(l.receivedQty) || 0
                const c = parseFloat(l.unitCost) || 0
                const lt = q * c
                const missing = l.productId && !(q > 0)
                return (
                  <tr key={i}>
                    <td className="px-2 py-2">
                      <select className={input + " w-full"} value={l.productId} onChange={(e) => onPickProduct(i, e.target.value)}>
                        <option value="">— product —</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select className={input} value={l.uomCode} onChange={(e) => setLine(i, { uomCode: e.target.value })}>
                        {uoms.map((u) => <option key={u.code} value={u.code}>{u.code}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={input + ` w-24 ${missing ? "border-amber-400 bg-amber-50" : ""}`}
                        type="number" inputMode="decimal" step="any" min="0"
                        placeholder="count"
                        value={l.receivedQty}
                        onChange={(e) => setLine(i, { receivedQty: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input className={input + " w-20"} type="number" step="any" min="0" placeholder="0" value={l.rejectedQty} onChange={(e) => setLine(i, { rejectedQty: e.target.value })} />
                    </td>
                    <td className="px-2 py-2">
                      <input className={input + " w-24"} type="number" inputMode="decimal" step="any" min="0" placeholder="Rs" value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} />
                    </td>
                    {hasGst && (
                      <td className="px-2 py-2">
                        <input className={input + " w-16"} type="number" step="any" min="0" placeholder="0" value={l.taxRatePct} onChange={(e) => setLine(i, { taxRatePct: e.target.value })} />
                      </td>
                    )}
                    <td className="px-2 py-2 text-right tabular-nums">{lt ? "Rs " + lt.toLocaleString("en-PK") : "—"}</td>
                    <td className="px-2 py-2 text-right">
                      {lines.length > 1 && <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="text-red-500">✕</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100">
          <button type="button" onClick={() => setLines((ls) => [...ls, blankLine()])} className="text-sm text-blue-600 hover:underline">+ Add line</button>
        </div>
      </div>

      {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">{error}</div>}

      {/* Sticky post bar */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="text-sm">
          <span className="text-slate-500">Grand total:</span>{" "}
          <span className="font-semibold tabular-nums">Rs {grandTotal.toLocaleString("en-PK")}</span>
          {missingCount > 0 && <span className="ml-3 text-amber-600">{missingCount} line(s) need a received qty</span>}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2.5 border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={busy || missingCount > 0} className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 disabled:bg-emerald-300">
            {busy ? "Posting…" : "Post GRN"}
          </button>
        </div>
      </div>
    </form>
  )
}
