"use client"

import { Fragment, useState } from "react"
import { useRouter } from "next/navigation"
import { updateOilAllocation } from "./actions"

interface OilRow {
  settingId: string
  recipeId: string | null
  name: string
  linked: boolean
  unitsSold: number
  friesGrams: number
  breadedGrams: number
  directOilMl: number
  directCostInRecipe: boolean
  fryerCost: number
  directCost: number
  totalCost: number
  periodCost: number
  notes: string | null
}

interface OilSummary {
  totalOilSpend: number
  directOilUnitCost: number
  breadedFactor: number
  directOilCost: number
  fryerPool: number
  friesCostPerGram: number
  breadedCostPerGram: number
  allocatedTotal: number
  variance: number
  sourceStart: string | null
  sourceEnd: string | null
}

const pkr = (value: number, digits = 2) =>
  `Rs ${value.toLocaleString("en-PK", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`

const shortDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat("en-PK", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" }).format(new Date(value)) : "—"

export function OilAllocationCard({ rows, summary, canEdit }: { rows: OilRow[]; summary: OilSummary; canEdit: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<OilRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function save() {
    if (!draft) return
    setBusy(true)
    setMessage(null)
    const result = await updateOilAllocation({
      settingId: draft.settingId,
      unitsSold: draft.unitsSold,
      friesGrams: draft.friesGrams,
      breadedGrams: draft.breadedGrams,
      directOilMl: draft.directOilMl,
    })
    setBusy(false)
    if (!result.ok) {
      setMessage(result.error ?? "Could not recalibrate oil.")
      return
    }
    setEditing(null)
    setDraft(null)
    setMessage("Oil pool recalculated and linked recipe costs were revised.")
    router.refresh()
  }

  return (
    <div className="editor-card">
      <div className="editor-card-head">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-sm text-amber-700 ring-1 ring-amber-100">◌</span>
            <div>
              <div className="font-display text-[15px] font-semibold text-stone-900">Six-month oil calibration</div>
              <div className="mt-0.5 text-[11px] text-stone-400">Direct cooking oil is costed by ml; the remaining pool is allocated by fryer load.</div>
            </div>
          </div>
          <div className="mt-2 text-[10.5px] text-stone-400">
            Source period {shortDate(summary.sourceStart)} – {shortDate(summary.sourceEnd)}
          </div>
        </div>
        <div className="rounded-xl bg-stone-900 px-4 py-2.5 text-right text-white shadow-lg">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-white/45">Reconciled oil pool</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums">{pkr(summary.allocatedTotal, 0)}</div>
          <div className={Math.abs(summary.variance) < 0.01 ? "text-[9.5px] text-leaf-300" : "text-[9.5px] text-amber-300"}>
            variance {pkr(summary.variance)}
          </div>
        </div>
      </div>

      <div className="grid gap-px border-b border-stone-200 bg-stone-200 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Source pool", pkr(summary.totalOilSpend, 0), "actual six-month oil cost"],
          ["Direct cooking", pkr(summary.directOilCost, 0), `${pkr(summary.directOilUnitCost, 4)} / ml`],
          ["Fryer pool", pkr(summary.fryerPool, 0), "after direct cooking oil"],
          ["Potato rate", pkr(summary.friesCostPerGram, 4), "per fryer-load gram"],
          ["Breaded rate", pkr(summary.breadedCostPerGram, 4), `${summary.breadedFactor.toFixed(2)}× potato rate`],
        ].map(([label, value, sub]) => (
          <div key={label} className="bg-white px-4 py-3">
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-400">{label}</div>
            <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-stone-900">{value}</div>
            <div className="mt-0.5 text-[9.5px] text-stone-400">{sub}</div>
          </div>
        ))}
      </div>

      {message && (
        <div className={"mx-4 mt-4 rounded-xl border px-3 py-2.5 text-xs " + (message.startsWith("Oil pool") ? "border-leaf-100 bg-leaf-50 text-leaf-800" : "border-red-100 bg-red-50 text-red-700")}>
          {message}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-[12px]">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/80 text-[9.5px] uppercase tracking-wide text-stone-400">
              <th className="px-3 py-2 text-left">Oil consumer</th>
              <th className="px-3 py-2 text-right">Period units</th>
              <th className="px-3 py-2 text-right">Potato g</th>
              <th className="px-3 py-2 text-right">Breaded g</th>
              <th className="px-3 py-2 text-right">Direct ml</th>
              <th className="px-3 py-2 text-right">Fryer / unit</th>
              <th className="px-3 py-2 text-right">Direct / unit</th>
              <th className="px-3 py-2 text-right">Total / unit</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((row) => {
              const active = editing === row.settingId && draft
              const value = active ? draft : row
              const set = (key: "unitsSold" | "friesGrams" | "breadedGrams" | "directOilMl", n: number) =>
                setDraft((current) => current ? { ...current, [key]: n } : current)
              return (
                <Fragment key={row.settingId}>
                  <tr className={active ? "bg-amber-50/50" : "transition-colors hover:bg-coral-50/35"}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900">{row.name}</span>
                        <span className={row.linked ? "rounded-full bg-leaf-50 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase text-leaf-700" : "rounded-full bg-amber-50 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase text-amber-700"}>
                          {row.linked ? "recipe linked" : "needs recipe"}
                        </span>
                      </div>
                      {row.notes && <div className="mt-0.5 max-w-[300px] truncate text-[9.5px] text-stone-400" title={row.notes}>{row.notes}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-stone-600">{row.unitsSold.toLocaleString("en-PK")}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-stone-600">{row.friesGrams || "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-stone-600">{row.breadedGrams || "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-stone-600">{row.directOilMl || "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-stone-500">{pkr(row.fryerCost)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-stone-500">{pkr(row.directCost)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-stone-900">{pkr(row.totalCost)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => active ? (setEditing(null), setDraft(null)) : (setEditing(row.settingId), setDraft({ ...row }), setMessage(null))}
                          className={active ? "rounded-lg bg-stone-900 px-3 py-1.5 text-[10.5px] font-semibold text-white" : "rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[10.5px] font-semibold text-stone-600 transition hover:border-coral-200 hover:bg-coral-50 hover:text-coral-700"}
                        >
                          {active ? "Close" : "Adjust"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {active && (
                    <tr>
                      <td colSpan={9} className="p-0">
                        <div className="border-y border-amber-100 bg-[linear-gradient(135deg,rgba(255,251,235,.88),rgba(255,255,255,.97)_65%)] p-5">
                          <div className="mb-4">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">Allocation drivers</div>
                            <h3 className="mt-0.5 font-display text-lg font-semibold text-stone-900">{row.name}</h3>
                            <p className="mt-1 text-xs text-stone-500">Changing one consumer recalculates the complete Rs 480,000 pool and updates every linked recipe.</p>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {([
                              ["unitsSold", "Units in source period", "units"],
                              ["friesGrams", "Potato fryer load", "g"],
                              ["breadedGrams", "Breaded fryer load", "g"],
                              ["directOilMl", "Direct cooking oil", "ml"],
                            ] as const).map(([key, label, suffix]) => (
                              <div key={key}>
                                <label className="form-label">{label}</label>
                                <div className="relative">
                                  <input
                                    className="form-control pr-14 text-right font-semibold tabular-nums"
                                    type="number"
                                    min="0"
                                    step={key === "unitsSold" ? "1" : "any"}
                                    value={value[key]}
                                    onChange={(event) => set(key, Number(event.target.value))}
                                  />
                                  <span className="field-adornment right-3">{suffix}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-amber-100 pt-4">
                            <p className="max-w-2xl text-[10.5px] leading-relaxed text-stone-400">
                              Direct oil already present as a recipe ingredient is not added twice. Unlinked consumers remain in the pool reconciliation and are clearly flagged.
                            </p>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => { setEditing(null); setDraft(null) }} className="btn-secondary">Cancel</button>
                              <button type="button" disabled={busy} onClick={save} className="btn-primary min-w-36">{busy ? "Recalculating…" : "Save & recalculate"}</button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
