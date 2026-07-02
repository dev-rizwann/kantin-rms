"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createProduct } from "../../actions"

interface Uom {
  code: string
  name: string
  dimension: string
}

const KINDS = [
  { v: "RAW_MATERIAL", l: "Raw material (ingredient)" },
  { v: "PACKAGING", l: "Packaging" },
  { v: "RESALE", l: "Resale (bottled water, packaged drinks)" },
  { v: "SUPPLIES", l: "Supplies (non-food)" },
]

export function ProductForm({ uoms }: { uoms: Uom[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [nameUr, setNameUr] = useState("")
  const [kind, setKind] = useState("RAW_MATERIAL")
  const [stockUomCode, setStockUomCode] = useState("KG")
  const [minStock, setMinStock] = useState("")
  const [packs, setPacks] = useState<{ uomCode: string; qtyInStockUom: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addPack() {
    setPacks((p) => [...p, { uomCode: "BOX", qtyInStockUom: "" }])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res = await createProduct({
      name,
      nameUr: nameUr || undefined,
      kind,
      stockUomCode,
      minStock: minStock ? parseFloat(minStock) : 0,
      packs: packs
        .filter((p) => p.uomCode && p.qtyInStockUom)
        .map((p) => ({ uomCode: p.uomCode, qtyInStockUom: parseFloat(p.qtyInStockUom) })),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? "Failed")
      return
    }
    router.push("/h8/products")
    router.refresh()
  }

  const input = "w-full px-3 py-2.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-coral-500"

  return (
    <form onSubmit={submit} className="max-w-2xl bg-white border border-stone-200 rounded-lg shadow-sm p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Name *</label>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Potato" />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Name (Urdu, optional)</label>
        <input className={input} dir="rtl" value={nameUr} onChange={(e) => setNameUr(e.target.value)} placeholder="آلو" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Kind</label>
          <select className={input} value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Stock unit *</label>
          <select className={input} value={stockUomCode} onChange={(e) => setStockUomCode(e.target.value)}>
            {uoms.map((u) => <option key={u.code} value={u.code}>{u.code} — {u.name}</option>)}
          </select>
          <p className="text-xs text-stone-400 mt-1">The unit you count this product in.</p>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Min stock (alert below this)</label>
        <input className={input} type="number" step="any" min="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="0" />
      </div>

      <div className="border-t border-stone-100 pt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-stone-700">Purchase pack sizes (optional)</label>
          <button type="button" onClick={addPack} className="text-xs text-coral-600 hover:underline">+ Add pack</button>
        </div>
        <p className="text-xs text-stone-400 mb-2">
          If you buy in a bigger unit (e.g. 1 BORI = 25 {stockUomCode}, 1 BOX = 24 {stockUomCode}), define it here so GRN entry can convert.
        </p>
        {packs.map((pk, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <select
              className="px-2 py-2 border border-stone-300 rounded-md text-sm"
              value={pk.uomCode}
              onChange={(e) => setPacks((p) => p.map((x, j) => (j === i ? { ...x, uomCode: e.target.value } : x)))}
            >
              {uoms.map((u) => <option key={u.code} value={u.code}>{u.code}</option>)}
            </select>
            <span className="text-sm text-stone-500">= </span>
            <input
              className="w-28 px-2 py-2 border border-stone-300 rounded-md text-sm"
              type="number" step="any" min="0" placeholder="qty"
              value={pk.qtyInStockUom}
              onChange={(e) => setPacks((p) => p.map((x, j) => (j === i ? { ...x, qtyInStockUom: e.target.value } : x)))}
            />
            <span className="text-sm text-stone-500">{stockUomCode}</span>
            <button type="button" onClick={() => setPacks((p) => p.filter((_, j) => j !== i))} className="text-red-500 text-sm ml-1">✕</button>
          </div>
        ))}
      </div>

      {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">{error}</div>}

      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="px-4 py-2.5 bg-coral-600 text-white font-medium rounded-md hover:bg-coral-700 disabled:bg-coral-400">
          {busy ? "Saving…" : "Save product"}
        </button>
        <button type="button" onClick={() => router.back()} className="px-4 py-2.5 border border-stone-300 rounded-md hover:bg-stone-50">Cancel</button>
      </div>
    </form>
  )
}
