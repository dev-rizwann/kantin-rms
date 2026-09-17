"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"

const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x }

type Preset = 7 | 30 | "month" | "all"

/** From/to date filter for Daily & Cash. Writes ?from=&to= so the server
 *  re-runs the query; presets are relative to the latest sale, not today. */
export function DateRangeFilter({ anchor }: { anchor: string | null }) {
  const router = useRouter(); const path = usePathname(); const sp = useSearchParams()
  const [pending, start] = useTransition()
  const curFrom = sp.get("from") ?? "", curTo = sp.get("to") ?? ""
  const [from, setFrom] = useState(curFrom)
  const [to, setTo] = useState(curTo)
  const active = !!(curFrom || curTo)

  function presetRange(p: Preset): [string, string] {
    if (p === "all") return ["", ""]
    const end = anchor ? new Date(anchor + "T00:00:00Z") : new Date()
    if (p === "month") return [iso(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))), iso(end)]
    return [iso(addDays(end, -(p - 1))), iso(end)]
  }
  function apply(f: string, t: string) {
    const q = new URLSearchParams()
    if (f) q.set("from", f); if (t) q.set("to", t)
    setFrom(f); setTo(t)
    start(() => router.push(q.toString() ? `${path}?${q}` : path))
  }
  const isOn = (p: Preset) => { const [f, t] = presetRange(p); return f === curFrom && t === curTo }

  const chip = (label: string, p: Preset) => (
    <button type="button" onClick={() => apply(...presetRange(p))} className={"rounded-md border px-2 py-[3px] text-[10.5px] font-semibold transition " + (isOn(p) ? "border-coral-200 bg-coral-50 text-coral-700" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50")}>{label}</button>
  )

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">Date range</span>
      <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="form-control-sm w-[130px]" />
      <span className="text-stone-300">→</span>
      <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="form-control-sm w-[130px]" />
      <button type="button" onClick={() => apply(from, to)} disabled={pending} className="rounded-md bg-stone-900 px-2.5 py-[3px] text-[10.5px] font-semibold text-white disabled:opacity-50">{pending ? "…" : "Apply"}</button>
      <span className="mx-1 h-4 w-px bg-stone-200" />
      {chip("Last 7 days", 7)}
      {chip("Last 30 days", 30)}
      {chip("This month", "month")}
      {chip("All", "all")}
      {active && <button type="button" onClick={() => apply("", "")} className="ml-auto text-[10.5px] font-semibold text-coral-700 hover:underline">Clear filter</button>}
    </div>
  )
}
