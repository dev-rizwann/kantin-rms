"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateFryingOilRate } from "./actions"

const pkrRate = (value: number) =>
  `Rs ${value.toLocaleString("en-PK", { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`

export function OilAllocationCard({ rate, canEdit }: { rate: number; canEdit: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(rate)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setMessage(null)
    const result = await updateFryingOilRate({ rate: value })
    setBusy(false)
    if (!result.ok) {
      setMessage(result.error ?? "Could not update the fryer rate.")
      return
    }
    setEditing(false)
    setMessage("Rate updated. All active deep-fried recipe lines now use the new per-gram cost.")
    router.refresh()
  }

  return (
    <section className="editor-card">
      <div className="editor-card-head">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-base text-amber-700 ring-1 ring-amber-100">°</span>
          <div>
            <h2 className="font-display text-[15px] font-semibold text-stone-900">Deep-frying oil rate</h2>
            <p className="mt-0.5 text-[11px] text-stone-400">One flat rate for every fried item — recipes calculate oil automatically from the grams of food entering the fryer.</p>
          </div>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setEditing((current) => !current)
              setValue(rate)
              setMessage(null)
            }}
            className="btn-secondary"
          >
            {editing ? "Cancel" : "Edit rate"}
          </button>
        )}
      </div>

      <div className="p-5">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/55 p-4 text-amber-900">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-60">Oil cost per fryer-input gram</div>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <div className="font-display text-lg font-semibold">All fried items</div>
              <p className="mt-1 max-w-md text-[11px] leading-relaxed opacity-65">
                Fries, chips, nuggets, popcorn chicken, tenders, zinger fillets and breaded patties — one rate, weighted from
                actual oil purchases ÷ total food fried.
              </p>
            </div>
            {editing ? (
              <div className="relative w-36 shrink-0">
                <span className="field-adornment left-3">Rs</span>
                <input
                  className="form-control pl-9 text-right font-semibold tabular-nums"
                  type="number"
                  min="0.000001"
                  step="0.000001"
                  value={value}
                  onChange={(event) => setValue(Number(event.target.value))}
                  aria-label="Oil cost per gram"
                />
              </div>
            ) : (
              <div className="shrink-0 text-right">
                <div className="text-xl font-semibold tabular-nums">{pkrRate(value)}</div>
                <div className="mt-0.5 text-[10px] opacity-55">per gram</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50/65 px-5 py-3">
        <p className="text-[10.5px] text-stone-400">Example: 147 g fries × rate ≈ Rs 13.4. Cooking or sauté oil is entered normally as an ingredient in ml.</p>
        {editing && <button type="button" onClick={save} disabled={busy} className="btn-primary min-w-32">{busy ? "Saving…" : "Save rate"}</button>}
        {message && <div className={message.startsWith("Rate updated") ? "text-xs font-medium text-leaf-700" : "text-xs font-medium text-red-600"}>{message}</div>}
      </div>
    </section>
  )
}
