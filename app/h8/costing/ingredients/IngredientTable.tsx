"use client"

import { useMemo, useState } from "react"
import { saveCostingIngredient } from "../actions"

export interface IngredientRow {
  id: string; name: string; kind: string; category: string; uomCode: string; packPrice: number | null; packQty: number | null
  unitCost: number | null; note: string | null; estimated: boolean; costingActive: boolean; updatedAt: string
}

export function IngredientTable({ ingredients, canEdit }: { ingredients: IngredientRow[]; canEdit: boolean }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<IngredientRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const categories = useMemo(() => [...new Set(ingredients.map((x) => x.category))].sort(), [ingredients])
  const rows = useMemo(() => ingredients.filter((x) => (!category || x.category === category) && (!query.trim() || x.name.toLowerCase().includes(query.toLowerCase().trim()))), [ingredients, category, query])
  const control = "rounded-lg border border-stone-200 bg-white px-3 py-2 text-[13px] focus:border-coral-500 focus:outline-none focus:ring-2 focus:ring-coral-500/20"
  const small = "w-full rounded-md border border-stone-200 px-2 py-1.5 text-[12px] focus:border-coral-500 focus:outline-none"

  async function save() {
    if (!draft || draft.packPrice == null || draft.packQty == null) return
    setBusy(true); setError(null)
    const res = await saveCostingIngredient({ id: draft.id, category: draft.category, packPrice: draft.packPrice, packQty: draft.packQty, note: draft.note ?? "", estimated: draft.estimated, costingActive: draft.costingActive })
    setBusy(false)
    if (!res.ok) { setError(res.error ?? "Could not save."); return }
    setEditing(null); setDraft(null); window.location.reload()
  }

  return <div>
    <div className="mb-3 flex flex-wrap gap-2"><input className={control + " w-60"} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ingredients…" /><select className={control} value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select><span className="ml-auto self-center text-[11px] text-stone-400">{rows.length} shown</span></div>
    {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]"><table className="w-full text-[12.5px]">
      <thead><tr className="border-b border-stone-200 bg-stone-50/80 text-[10px] uppercase tracking-wide text-stone-400"><th className="px-3 py-2 text-left">Ingredient</th><th className="px-3 py-2 text-left">Category</th><th className="px-3 py-2 text-left">Kind</th><th className="px-3 py-2 text-right">Pack price</th><th className="px-3 py-2 text-right">Pack qty</th><th className="px-3 py-2 text-right">Cost / {"UoM"}</th><th className="px-3 py-2 text-left">Quality</th><th className="px-3 py-2"></th></tr></thead>
      <tbody className="divide-y divide-stone-100">{rows.map((row) => {
        const active = editing === row.id && draft
        const value = active ? draft : row
        const set = <K extends keyof IngredientRow>(key: K, val: IngredientRow[K]) => setDraft((d) => d ? { ...d, [key]: val } : d)
        return <tr key={row.id} className={row.costingActive ? "hover:bg-coral-50/50" : "bg-stone-50/60 text-stone-400"}>
          <td className="px-3 py-2"><div className="font-medium text-stone-900">{row.name}</div>{active ? <textarea className={small + " mt-1 min-w-64"} rows={2} value={value.note ?? ""} onChange={(e) => set("note", e.target.value)} /> : row.note && <div className="mt-0.5 max-w-xs truncate text-[10.5px] text-stone-400" title={row.note}>{row.note}</div>}</td>
          <td className="px-3 py-2">{active ? <input className={small + " min-w-36"} value={value.category} onChange={(e) => set("category", e.target.value)} list="cost-categories" /> : row.category}</td>
          <td className="px-3 py-2 text-[10.5px] text-stone-400">{row.kind.replaceAll("_", " ")}</td>
          <td className="px-3 py-2 text-right tabular-nums">{active ? <input className={small + " w-24 text-right"} type="number" min="0.000001" step="any" value={value.packPrice ?? ""} onChange={(e) => set("packPrice", Number(e.target.value))} /> : row.packPrice == null ? "—" : `Rs ${row.packPrice.toLocaleString("en-PK")}`}</td>
          <td className="px-3 py-2 text-right tabular-nums">{active ? <input className={small + " w-24 text-right"} type="number" min="0.000001" step="any" value={value.packQty ?? ""} onChange={(e) => set("packQty", Number(e.target.value))} /> : `${row.packQty?.toLocaleString("en-PK") ?? "—"} ${row.uomCode}`}</td>
          <td className="px-3 py-2 text-right font-medium tabular-nums">{active && value.packPrice != null && value.packQty ? `Rs ${(value.packPrice / value.packQty).toFixed(4)}` : row.unitCost == null ? "—" : `Rs ${row.unitCost.toFixed(4)}`}</td>
          <td className="px-3 py-2">{active ? <div className="space-y-1"><label className="flex gap-1.5"><input type="checkbox" checked={value.estimated} onChange={(e) => set("estimated", e.target.checked)} /> Needs confirmation</label><label className="flex gap-1.5"><input type="checkbox" checked={value.costingActive} onChange={(e) => set("costingActive", e.target.checked)} /> Active</label></div> : <span className={row.estimated ? "rounded bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-700" : "rounded bg-leaf-50 px-1.5 py-0.5 text-[10.5px] font-medium text-leaf-700"}>{row.estimated ? "confirm" : "verified"}</span>}</td>
          <td className="px-3 py-2 text-right">{canEdit ? (active ? <div className="flex justify-end gap-2"><button disabled={busy} onClick={save} className="font-medium text-coral-700 hover:underline">{busy ? "Saving…" : "Save"}</button><button onClick={() => { setEditing(null); setDraft(null); setError(null) }} className="text-stone-400 hover:underline">Cancel</button></div> : <button onClick={() => { setEditing(row.id); setDraft({ ...row }); setError(null) }} className="font-medium text-coral-700 hover:underline">Edit</button>) : null}</td>
        </tr>
      })}</tbody>
    </table></div>
    <datalist id="cost-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
  </div>
}
