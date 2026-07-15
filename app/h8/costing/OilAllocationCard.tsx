"use client"

import { useState } from "react"
import { updateOilAllocation } from "./actions"

interface OilRow { recipeId: string; name: string; unitsSold: number; friesGrams: number; breadedGrams: number; soakFactor: number; cost: number; sourceTotalOilSpend: number | null }

export function OilAllocationCard({ rows, canEdit }: { rows: OilRow[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<OilRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const input = "w-24 rounded-md border border-stone-200 px-2 py-1.5 text-right text-xs tabular-nums focus:border-coral-500 focus:outline-none"

  async function save() {
    if (!draft) return
    setBusy(true); setMessage(null)
    const result = await updateOilAllocation(draft)
    setBusy(false)
    if (!result.ok) { setMessage(result.error ?? "Could not save."); return }
    setEditing(null); setDraft(null); setMessage("Oil allocation saved as a new recipe revision.")
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      <div className="border-b border-stone-100 px-4 py-3">
        <div className="font-display text-[14px] font-semibold text-stone-800">Frying-oil allocation</div>
        <div className="mt-0.5 text-[11px] text-stone-400">Workbook-compatible Rs 480,000 velocity × fry-load model. Every cost change creates a recipe revision.</div>
      </div>
      {message && <div className={"mx-4 mt-3 rounded-md px-3 py-2 text-xs " + (message.startsWith("Oil") ? "bg-leaf-50 text-leaf-800" : "bg-red-50 text-red-700")}>{message}</div>}
      <table className="w-full text-[12.5px]">
        <thead><tr className="border-b border-stone-200 bg-stone-50/80 text-[10px] uppercase tracking-wide text-stone-400">
          <th className="px-3 py-2 text-left">Recipe</th><th className="px-3 py-2 text-right">Units</th><th className="px-3 py-2 text-right">Fries g</th><th className="px-3 py-2 text-right">Breaded g</th><th className="px-3 py-2 text-right">Soak ×</th><th className="px-3 py-2 text-right">Oil / plate</th><th className="px-3 py-2"></th>
        </tr></thead>
        <tbody className="divide-y divide-stone-100">{rows.map((row) => {
          const active = editing === row.recipeId && draft
          const value = active ? draft : row
          const set = (key: keyof OilRow, n: number) => setDraft((d) => d ? { ...d, [key]: n } : d)
          return <tr key={row.recipeId} className="hover:bg-coral-50/50">
            <td className="px-3 py-2 font-medium text-stone-900">{row.name}</td>
            {(["unitsSold", "friesGrams", "breadedGrams", "soakFactor", "cost"] as const).map((key) => <td key={key} className="px-3 py-2 text-right tabular-nums">{active ? <input className={input} type="number" min="0" step={key === "unitsSold" ? "1" : "any"} value={value[key]} onChange={(e) => set(key, Number(e.target.value))} /> : key === "cost" ? `Rs ${row.cost.toFixed(2)}` : row[key].toLocaleString("en-PK")}</td>)}
            <td className="px-3 py-2 text-right">{canEdit ? (active ? <span className="flex justify-end gap-2"><button disabled={busy} onClick={save} className="font-medium text-coral-700 hover:underline">{busy ? "Saving…" : "Save"}</button><button onClick={() => { setEditing(null); setDraft(null) }} className="text-stone-400 hover:underline">Cancel</button></span> : <button onClick={() => { setEditing(row.recipeId); setDraft({ ...row }); setMessage(null) }} className="font-medium text-coral-700 hover:underline">Edit</button>) : null}</td>
          </tr>
        })}</tbody>
      </table>
    </div>
  )
}
