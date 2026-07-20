"use client"

import { Fragment, useMemo, useState } from "react"
import { createCostingIngredient, saveCostingIngredient } from "../actions"

export interface IngredientRow {
  id: string; name: string; kind: string; category: string; uomCode: string; packPrice: number | null; packQty: number | null
  unitCost: number | null; note: string | null; estimated: boolean; costingActive: boolean; updatedAt: string
}

type NewDraft = { name: string; kind: "RAW_MATERIAL" | "PACKAGING"; category: string; uomCode: string; packPrice: number; packQty: number; note: string; estimated: boolean }
const EMPTY_NEW: NewDraft = { name: "", kind: "RAW_MATERIAL", category: "", uomCode: "GRAM", packPrice: 0, packQty: 0, note: "", estimated: false }

export function IngredientTable({ ingredients, canEdit, uoms }: { ingredients: IngredientRow[]; canEdit: boolean; uoms: { code: string; name: string }[] }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<IngredientRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [newDraft, setNewDraft] = useState<NewDraft>(EMPTY_NEW)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const categories = useMemo(() => [...new Set(ingredients.map((x) => x.category))].sort(), [ingredients])
  const rows = useMemo(() => ingredients.filter((x) => (!category || x.category === category) && (!query.trim() || x.name.toLowerCase().includes(query.toLowerCase().trim()))), [ingredients, category, query])
  const control = "form-control"

  async function save() {
    if (!draft || draft.packPrice == null || draft.packQty == null) return
    setBusy(true); setError(null)
    const res = await saveCostingIngredient({ id: draft.id, category: draft.category, packPrice: draft.packPrice, packQty: draft.packQty, note: draft.note ?? "", estimated: draft.estimated, costingActive: draft.costingActive })
    setBusy(false)
    if (!res.ok) { setError(res.error ?? "Could not save."); return }
    setEditing(null); setDraft(null); window.location.reload()
  }

  async function saveNew() {
    if (!newDraft.name.trim() || !newDraft.category.trim() || newDraft.packPrice <= 0 || newDraft.packQty <= 0) { setError("Name, category, pack price and pack quantity are required."); return }
    setBusy(true); setError(null)
    const res = await createCostingIngredient({ ...newDraft, name: newDraft.name.trim(), category: newDraft.category.trim(), note: newDraft.note || undefined })
    setBusy(false)
    if (!res.ok) { setError(res.error ?? "Could not create the ingredient."); return }
    setCreating(false); setNewDraft(EMPTY_NEW); window.location.reload()
  }
  const patchNew = <K extends keyof NewDraft>(key: K, val: NewDraft[K]) => setNewDraft((d) => ({ ...d, [key]: val }))

  return <div>
    <div className="editor-card mb-4 flex flex-wrap items-center gap-3 p-3"><div className="relative min-w-64 flex-1"><span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-300">⌕</span><input className={control + " pl-9"} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by ingredient name…" /></div><select className={control + " min-w-48 md:w-auto"} value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All ingredient groups</option>{categories.map((c) => <option key={c}>{c}</option>)}</select><span className="rounded-full bg-stone-100 px-2.5 py-[3px] text-[10.5px] font-semibold tabular-nums text-stone-500">{rows.length} of {ingredients.length}</span>{canEdit && <button type="button" onClick={() => { setCreating((v) => !v); setError(null) }} className={creating ? "rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white" : "btn-primary"}>{creating ? "Close" : "+ New ingredient"}</button>}</div>
    {error && <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {creating && <div className="editor-card mb-4 border-leaf-200 bg-[linear-gradient(135deg,rgba(245,250,236,.75),rgba(255,255,255,.95)_58%)] p-5">
      <div className="mb-4"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-leaf-700">New ingredient</div><h3 className="mt-0.5 font-display text-lg font-semibold text-stone-900">Add a raw material or packaging item</h3><p className="mt-1 text-xs text-stone-500">It becomes available in every recipe dropdown immediately, with a cost-history record from day one.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div><label className="form-label">Ingredient name</label><input className={control + " font-medium"} value={newDraft.name} onChange={(e) => patchNew("name", e.target.value)} placeholder="e.g. Sesame Bun (large)" /></div>
        <div><label className="form-label">Type</label><select className={control} value={newDraft.kind} onChange={(e) => patchNew("kind", e.target.value as NewDraft["kind"])}><option value="RAW_MATERIAL">Raw material</option><option value="PACKAGING">Packaging</option></select></div>
        <div><label className="form-label">Costing category</label><input className={control} value={newDraft.category} onChange={(e) => patchNew("category", e.target.value)} list="cost-categories" placeholder="e.g. Bakery, Sauces, Packaging" /></div>
        <div><label className="form-label">Stock unit</label><select className={control} value={newDraft.uomCode} onChange={(e) => patchNew("uomCode", e.target.value)}>{uoms.map((u) => <option key={u.code} value={u.code}>{u.name} · {u.code}</option>)}</select></div>
        <div><label className="form-label">Supplier pack price</label><div className="relative"><span className="field-adornment left-3">Rs</span><input className={control + " pl-10 text-right font-semibold tabular-nums"} type="number" min="0.01" step="any" value={newDraft.packPrice || ""} onChange={(e) => patchNew("packPrice", Number(e.target.value))} /></div></div>
        <div><label className="form-label">Usable pack quantity</label><div className="relative"><input className={control + " pr-16 text-right font-semibold tabular-nums"} type="number" min="0.000001" step="any" value={newDraft.packQty || ""} onChange={(e) => patchNew("packQty", Number(e.target.value))} /><span className="field-adornment right-3">{newDraft.uomCode}</span></div></div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div><label className="form-label">Purchase note / source</label><input className={control} value={newDraft.note} onChange={(e) => patchNew("note", e.target.value)} placeholder="Supplier, invoice reference, or estimate reason…" /></div>
        <label className="mb-2 flex cursor-pointer items-center gap-2 text-[11px] font-medium text-stone-600"><input className="accent-coral-600" type="checkbox" checked={newDraft.estimated} onChange={(e) => patchNew("estimated", e.target.checked)} /> Price needs confirmation</label>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-leaf-100 pt-4">
        <div className="text-xs text-stone-500">Unit cost: <strong className="tabular-nums text-stone-800">{newDraft.packPrice > 0 && newDraft.packQty > 0 ? `Rs ${(newDraft.packPrice / newDraft.packQty).toFixed(4)} / ${newDraft.uomCode}` : "—"}</strong></div>
        <button type="button" disabled={busy} onClick={saveNew} className="btn-primary min-w-36">{busy ? "Creating…" : "Create ingredient"}</button>
      </div>
    </div>}
    <div className="editor-card overflow-x-auto"><table className="w-full text-[11.5px] leading-tight">
      <thead><tr className="border-b border-stone-200 bg-stone-50/80 text-[10px] uppercase tracking-wide text-stone-400"><th className="px-2.5 py-1.5 text-left">Ingredient</th><th className="px-2.5 py-1.5 text-left">Category</th><th className="px-2.5 py-1.5 text-left">Kind</th><th className="px-2.5 py-1.5 text-right">Pack price</th><th className="px-2.5 py-1.5 text-right">Pack qty</th><th className="px-2.5 py-1.5 text-right">Cost / {"UoM"}</th><th className="px-2.5 py-1.5 text-left">Quality</th><th className="px-2.5 py-1.5"></th></tr></thead>
      <tbody className="divide-y divide-stone-100">{rows.map((row) => {
        const active = editing === row.id && draft
        const value = active ? draft : row
        const set = <K extends keyof IngredientRow>(key: K, val: IngredientRow[K]) => setDraft((d) => d ? { ...d, [key]: val } : d)
        return <Fragment key={row.id}><tr className={active ? "bg-coral-50/60" : row.costingActive ? "transition-colors hover:bg-coral-50/35" : "bg-stone-50/60 text-stone-400"}>
          <td className="max-w-[280px] px-2.5 py-[3px]"><div className="flex min-w-0 items-baseline gap-2"><span className="shrink-0 font-semibold text-stone-900">{row.name}</span>{row.note && <span className="truncate text-[10px] text-stone-400" title={row.note}>{row.note}</span>}</div></td>
          <td className="whitespace-nowrap px-2.5 py-[3px]"><span className="rounded bg-stone-100 px-1.5 py-0 text-[9.5px] font-medium leading-[15px] text-stone-600">{row.category}</span></td>
          <td className="whitespace-nowrap px-2.5 py-[3px] text-[10px] text-stone-400">{row.kind === "RAW_MATERIAL" ? "Raw" : row.kind === "PACKAGING" ? "Packaging" : row.kind}</td>
          <td className="whitespace-nowrap px-2.5 py-[3px] text-right tabular-nums">{row.packPrice == null ? "—" : `Rs ${row.packPrice.toLocaleString("en-PK")}`}</td>
          <td className="whitespace-nowrap px-2.5 py-[3px] text-right tabular-nums">{`${row.packQty?.toLocaleString("en-PK") ?? "—"} ${row.uomCode}`}</td>
          <td className="whitespace-nowrap px-2.5 py-[3px] text-right font-semibold tabular-nums text-stone-900">{row.unitCost == null ? "—" : `Rs ${row.unitCost.toFixed(4)}`}</td>
          <td className="whitespace-nowrap px-2.5 py-[3px]"><span className={row.estimated ? "rounded-full bg-amber-50 px-1.5 py-0 text-[9px] font-semibold uppercase leading-[15px] tracking-wide text-amber-700 ring-1 ring-amber-100" : "rounded-full bg-leaf-50 px-1.5 py-0 text-[9px] font-semibold uppercase leading-[15px] tracking-wide text-leaf-700 ring-1 ring-leaf-100"}>{row.estimated ? "Confirm" : "Verified"}</span></td>
          <td className="whitespace-nowrap px-2.5 py-[3px] text-right">{canEdit ? <button onClick={() => active ? (setEditing(null), setDraft(null), setError(null)) : (setEditing(row.id), setDraft({ ...row }), setError(null))} className={active ? "rounded bg-stone-900 px-2 py-[2px] text-[10px] font-semibold text-white" : "rounded border border-stone-200 bg-white px-2 py-[2px] text-[10px] font-semibold text-stone-600 transition hover:border-coral-200 hover:bg-coral-50 hover:text-coral-700"}>{active ? "Close" : "Edit"}</button> : null}</td>
        </tr>
        {active && <tr><td colSpan={8} className="p-0"><div className="border-y border-coral-100 bg-[linear-gradient(135deg,rgba(253,242,239,.78),rgba(255,255,255,.96)_58%,rgba(245,250,236,.55))] p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-coral-700">Editing pack cost</div><h3 className="mt-0.5 font-display text-lg font-semibold text-stone-900">{row.name}</h3><p className="mt-1 text-xs text-stone-500">Enter the supplier pack price and the usable quantity inside that pack.</p></div><div className="rounded-xl border border-white bg-white/80 px-4 py-2.5 text-right shadow-sm"><div className="text-[9.5px] font-semibold uppercase tracking-wide text-stone-400">Calculated unit cost</div><div className="mt-0.5 text-xl font-semibold tabular-nums text-stone-900">{value.packPrice != null && value.packQty ? `Rs ${(value.packPrice / value.packQty).toFixed(4)}` : "—"}</div><div className="text-[10px] text-stone-400">per {row.uomCode}</div></div></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><div><label className="form-label">Costing category</label><input className="form-control" value={value.category} onChange={(e) => set("category", e.target.value)} list="cost-categories" /></div><div><label className="form-label">Supplier pack price</label><div className="relative"><span className="field-adornment left-3">Rs</span><input className="form-control pl-10 text-right font-semibold tabular-nums" type="number" min="0.000001" step="any" value={value.packPrice ?? ""} onChange={(e) => set("packPrice", Number(e.target.value))} /></div></div><div><label className="form-label">Usable pack quantity</label><div className="relative"><input className="form-control pr-16 text-right font-semibold tabular-nums" type="number" min="0.000001" step="any" value={value.packQty ?? ""} onChange={(e) => set("packQty", Number(e.target.value))} /><span className="field-adornment right-3">{row.uomCode}</span></div></div><div><label className="form-label">Cost status</label><div className="flex h-[42px] items-center gap-4 rounded-xl border border-stone-200 bg-white/70 px-3"><label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-stone-600"><input className="accent-coral-600" type="checkbox" checked={value.estimated} onChange={(e) => set("estimated", e.target.checked)} /> Needs confirmation</label><label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-stone-600"><input className="accent-leaf-600" type="checkbox" checked={value.costingActive} onChange={(e) => set("costingActive", e.target.checked)} /> Active</label></div></div></div>
          <div className="mt-4"><label className="form-label">Purchase note / source</label><textarea className="form-control min-h-20 resize-y" rows={2} value={value.note ?? ""} onChange={(e) => set("note", e.target.value)} placeholder="Supplier, pack specification, estimate reason, or verification note…" /></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-coral-100/70 pt-4"><p className="text-[11px] text-stone-400">Saving updates the live product cost and writes an auditable cost-history record.</p><div className="flex gap-2"><button type="button" onClick={() => { setEditing(null); setDraft(null); setError(null) }} className="btn-secondary">Cancel</button><button type="button" disabled={busy || value.packPrice == null || value.packQty == null} onClick={save} className="btn-primary min-w-32">{busy ? "Saving…" : "Save pack cost"}</button></div></div>
        </div></td></tr>}
        </Fragment>
      })}</tbody>
    </table></div>
    <datalist id="cost-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
  </div>
}
