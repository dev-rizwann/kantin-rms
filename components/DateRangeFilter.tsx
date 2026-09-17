"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { money, num, shortDate } from "@/lib/format"

type RangeTotals = { from: string | null; to: string | null; days: number; tickets: number; gross: number; cash: number; credit: number; foodPanda: number }

const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x }

/** From/to date filter for the daily table. Writes ?from=&to= so the server
 *  re-runs the query; presets are relative to the latest sale, not today. */
export function DateRangeFilter({ anchor, totals }: { anchor: string | null; totals: RangeTotals }) {
  const router = useRouter(); const path = usePathname(); const sp = useSearchParams()
  const [pending, start] = useTransition()
  const [from, setFrom] = useState(sp.get("from") ?? "")
  const [to, setTo] = useState(sp.get("to") ?? "")
  const active = !!(sp.get("from") || sp.get("to"))

  function apply(f: string, t: string) {
    const q = new URLSearchParams()
    if (f) q.set("from", f); if (t) q.set("to", t)
    setFrom(f); setTo(t)
    start(() => router.push(q.toString() ? `${path}?${q}` : path))
  }
  function preset(days: number | "month" | "all") {
    if (days === "all") return apply("", "")
    const end = anchor ? new Date(anchor + "T00:00:00Z") : new Date()
    if (days === "month") return apply(iso(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))), iso(end))
    apply(iso(addDays(end, -(days - 1))), iso(end))
  }

  const chip = (label: string, on: () => void, isOn = false) => (
    <button type="button" onClick={on} className={"rounded-md border px-2 py-[3px] text-[10.5px] font-semibold transition " + (isOn ? "border-coral-200 bg-coral-50 text-coral-700" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50")}>{label}</button>
  )

  return (
    <div className="mb-3 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">Date range</span>
        <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="form-control-sm w-[130px]" />
        <span className="text-stone-300">→</span>
        <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="form-control-sm w-[130px]" />
        <button type="button" onClick={() => apply(from, to)} disabled={pending} className="rounded-md bg-stone-900 px-2.5 py-[3px] text-[10.5px] font-semibold text-white disabled:opacity-50">{pending ? "…" : "Apply"}</button>
        <span className="mx-1 h-4 w-px bg-stone-200" />
        {chip("Last 7", () => preset(7))}
        {chip("Last 30", () => preset(30))}
        {chip("This month", () => preset("month"))}
        {chip("All", () => preset("all"), !active)}
        {active && <button type="button" onClick={() => preset("all")} className="ml-auto text-[10.5px] font-semibold text-coral-700 hover:underline">Clear filter</button>}
      </div>

      {active && (
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-stone-100 pt-2 text-[11.5px]">
          <span className="font-semibold text-stone-700">{shortDate(totals.from)} – {shortDate(totals.to)}</span>
          <span className="text-stone-500">{num(totals.days)} selling days · {num(totals.tickets)} tickets</span>
          <span className="font-semibold tabular-nums text-stone-900">Revenue {money(totals.gross)}</span>
          <span className="tabular-nums text-stone-500">Cash {money(totals.cash, { compact: true })} · Credit {money(totals.credit, { compact: true })} · Food Panda {money(totals.foodPanda, { compact: true })}</span>
          {totals.days > 0 && <span className="tabular-nums text-stone-400">avg {money(totals.gross / totals.days, { compact: true })} / day</span>}
        </div>
      )}
    </div>
  )
}
