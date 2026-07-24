"use client"

import { Fragment, useCallback, useState } from "react"
import { money, num, shortDate } from "@/lib/format"
import type { H8DayItems } from "@/lib/h8-live"
import { DayItems } from "./DayItems"

export interface DailyRow {
  saleDate: string; tickets: number; gross: number; paymentsNet: number
  rounding: number; variance: number; voids: number; cancels: number; refunds: number
}

type DayState = { loading: boolean; error?: string; data?: H8DayItems }

const TH = "border-b border-stone-200 bg-stone-50/80 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-stone-400 whitespace-nowrap"

/** Daily summary where a row opens in place to show that day's tickets and the
 *  items on each. Ticket detail is fetched on first expand — the day query is
 *  ~1s against the JSON-backed mp_* views, too slow to prefetch for every row. */
export function DailyLedger({ rows }: { rows: DailyRow[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const [days, setDays] = useState<Record<string, DayState>>({})

  const toggle = useCallback(async (date: string) => {
    if (open === date) { setOpen(null); return }
    setOpen(date)
    setDays((d) => {
      if (d[date]?.data || d[date]?.loading) return d
      void load(date)
      return { ...d, [date]: { loading: true } }
    })
  }, [open])

  async function load(date: string) {
    try {
      const res = await fetch(`/api/h8/day-items?date=${date}`, { cache: "no-store" })
      if (!res.ok) throw new Error(res.status === 403 ? "You don't have access to sales detail." : `Could not load sales (${res.status}).`)
      const json = await res.json()
      setDays((d) => ({ ...d, [date]: { loading: false, data: { items: json.items ?? [], totalQty: json.totalQty ?? 0, totalSales: json.totalSales ?? 0, distinctItems: json.distinctItems ?? 0 } } }))
    } catch (e) {
      setDays((d) => ({ ...d, [date]: { loading: false, error: e instanceof Error ? e.message : "Could not load sales." } }))
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className={TH + " w-6"} />
            <th className={TH + " text-left"}>Date</th>
            <th className={TH + " text-right"}>Tickets</th>
            <th className={TH + " text-right"}>Gross</th>
            <th className={TH + " text-right"}>Payments</th>
            <th className={TH + " text-right"}>Rounding</th>
            <th className={TH + " text-right"}>Variance</th>
            <th className={TH + " text-right"}>Voids</th>
            <th className={TH + " text-right"}>Cancel/Refund</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-stone-500">No data</td></tr>}
          {rows.map((r) => {
            const v = r.variance - r.rounding
            const vCls = Math.abs(v) < 1 ? "text-stone-300" : Math.abs(v) < 50 ? "font-medium text-amber-600" : "font-medium text-red-600"
            const isOpen = open === r.saleDate
            const state = days[r.saleDate]
            return (
              <Fragment key={r.saleDate}>
                <tr onClick={() => toggle(r.saleDate)} className={"cursor-pointer transition-colors " + (isOpen ? "bg-coral-50/80" : "hover:bg-coral-50/70")}>
                  <td className="px-2 py-1.5 text-center text-[10px] text-stone-400">{isOpen ? "▾" : "▸"}</td>
                  <td className="px-3 py-1.5"><span className={"font-medium " + (isOpen ? "text-coral-800" : "text-coral-700")}>{shortDate(r.saleDate)}</span></td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-stone-400">{num(r.tickets)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium tabular-nums text-stone-900">{money(r.gross)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-stone-600">{money(r.paymentsNet)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-stone-400">{r.rounding ? money(r.rounding) : "—"}</td>
                  <td className={"whitespace-nowrap px-3 py-1.5 text-right tabular-nums " + vCls}>{Math.abs(v) < 1 ? "—" : money(v)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{r.voids ? <span className="font-medium text-amber-600">{num(r.voids)}</span> : <span className="text-stone-300">—</span>}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{r.cancels + r.refunds ? <span className="font-medium text-red-600">{r.cancels}/{r.refunds}</span> : <span className="text-stone-300">—</span>}</td>
                </tr>
                {isOpen && <tr><td colSpan={9} className="border-y border-stone-200 bg-stone-50/70 px-3 py-2.5">
                  {!state || state.loading
                    ? <div className="py-4 text-center text-[12px] text-stone-400">Loading sales for {shortDate(r.saleDate)}…</div>
                    : state.error
                      ? <div className="py-4 text-center text-[12px] text-red-600">{state.error}</div>
                      : state.data && <DayItems data={state.data} fullDayHref={`/h8/daily/${r.saleDate}`} />}
                </td></tr>}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
