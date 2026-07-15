"use client"

import { Fragment, useState } from "react"
import { updateOilAllocation } from "./actions"

interface OilRow { recipeId: string; name: string; unitsSold: number; friesGrams: number; breadedGrams: number; soakFactor: number; cost: number; sourceTotalOilSpend: number | null }

export function OilAllocationCard({ rows, canEdit }: { rows: OilRow[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<OilRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function save() {
    if (!draft) return
    setBusy(true); setMessage(null)
    const result = await updateOilAllocation(draft)
    setBusy(false)
    if (!result.ok) { setMessage(result.error ?? "Could not save."); return }
    setEditing(null); setDraft(null); setMessage("Oil allocation saved as a new recipe revision.")
  }

  return (
    <div className="editor-card overflow-x-auto">
      <div className="editor-card-head">
        <div className="flex gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-sm text-amber-700 ring-1 ring-amber-100">◌</span><div><div className="font-display text-[15px] font-semibold text-stone-900">Frying-oil allocation</div><div className="mt-0.5 text-[11px] text-stone-400">Velocity × fry-load model; every adjustment creates a recipe revision.</div></div></div>
        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold text-stone-500">Rs 480,000 source model</span>
      </div>
      {message && <div className={"mx-4 mt-4 rounded-xl border px-3 py-2.5 text-xs " + (message.startsWith("Oil") ? "border-leaf-100 bg-leaf-50 text-leaf-800" : "border-red-100 bg-red-50 text-red-700")}>{message}</div>}
      <table className="w-full text-[12.5px]">
        <thead><tr className="border-b border-stone-200 bg-stone-50/80 text-[10px] uppercase tracking-wide text-stone-400">
          <th className="px-3 py-2 text-left">Recipe</th><th className="px-3 py-2 text-right">Units</th><th className="px-3 py-2 text-right">Fries g</th><th className="px-3 py-2 text-right">Breaded g</th><th className="px-3 py-2 text-right">Soak ×</th><th className="px-3 py-2 text-right">Oil / plate</th><th className="px-3 py-2"></th>
        </tr></thead>
        <tbody className="divide-y divide-stone-100">{rows.map((row) => {
          const active = editing === row.recipeId && draft
          const value = active ? draft : row
          const set = (key: keyof OilRow, n: number) => setDraft((d) => d ? { ...d, [key]: n } : d)
          return <Fragment key={row.recipeId}><tr className={active ? "bg-amber-50/45" : "transition-colors hover:bg-coral-50/35"}>
            <td className="px-3 py-2.5 font-semibold text-stone-900">{row.name}</td>
            {(["unitsSold", "friesGrams", "breadedGrams", "soakFactor", "cost"] as const).map((key) => <td key={key} className={"px-3 py-2.5 text-right tabular-nums " + (key === "cost" ? "font-semibold text-stone-900" : "text-stone-600")}>{key === "cost" ? `Rs ${row.cost.toFixed(2)}` : row[key].toLocaleString("en-PK")}</td>)}
            <td className="px-3 py-2.5 text-right">{canEdit ? <button onClick={() => active ? (setEditing(null), setDraft(null)) : (setEditing(row.recipeId), setDraft({ ...row }), setMessage(null))} className={active ? "rounded-lg bg-stone-900 px-3 py-1.5 text-[11px] font-semibold text-white" : "rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-stone-600 transition hover:border-coral-200 hover:bg-coral-50 hover:text-coral-700"}>{active ? "Close" : "Tune model"}</button> : null}</td>
          </tr>
          {active && <tr><td colSpan={7} className="p-0"><div className="border-y border-amber-100 bg-[linear-gradient(135deg,rgba(255,251,235,.86),rgba(255,255,255,.96)_62%,rgba(253,242,239,.55))] p-5"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">Oil model inputs</div><h3 className="mt-0.5 font-display text-lg font-semibold text-stone-900">{row.name}</h3><p className="mt-1 text-xs text-stone-500">Use a representative sales period and the average fried load per plate.</p></div><div className="rounded-xl bg-stone-900 px-4 py-2.5 text-right text-white shadow-lg"><div className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Allocated oil / plate</div><div className="mt-0.5 text-xl font-semibold tabular-nums">Rs {value.cost.toFixed(2)}</div></div></div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{([['unitsSold','Units in period','plates'],['friesGrams','Fries load','g'],['breadedGrams','Breaded load','g'],['soakFactor','Absorption factor','×'],['cost','Allocated cost','Rs']] as const).map(([key, fieldLabel, suffix]) => <div key={key}><label className="form-label">{fieldLabel}</label><div className="relative">{suffix === 'Rs' && <span className="field-adornment left-3">Rs</span>}<input className={"form-control text-right font-semibold tabular-nums " + (suffix === 'Rs' ? 'pl-9' : 'pr-14')} type="number" min="0" step={key === "unitsSold" ? "1" : "any"} value={value[key]} onChange={(e) => set(key, Number(e.target.value))} />{suffix !== 'Rs' && <span className="field-adornment right-3">{suffix}</span>}</div></div>)}</div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-amber-100 pt-4"><p className="text-[11px] text-stone-400">Saving writes the new oil cost into an immutable recipe revision.</p><div className="flex gap-2"><button type="button" onClick={() => { setEditing(null); setDraft(null) }} className="btn-secondary">Cancel</button><button type="button" disabled={busy} onClick={save} className="btn-primary min-w-32">{busy ? "Saving…" : "Save allocation"}</button></div></div></div></td></tr>}
          </Fragment>
        })}</tbody>
      </table>
    </div>
  )
}
