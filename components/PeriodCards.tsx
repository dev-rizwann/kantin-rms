import { money, num, shortDate } from "@/lib/format"
import type { H8Period } from "@/lib/h8-live"

function Delta({ now, before }: { now: number; before: number }) {
  if (before <= 0) return <span className="text-[10.5px] text-stone-400">no prior period</span>
  const pct = ((now - before) / before) * 100
  const up = pct >= 0
  return (
    <span className={"inline-flex items-center gap-1 rounded-full px-1.5 py-[1px] text-[10.5px] font-semibold tabular-nums " + (up ? "bg-leaf-50 text-leaf-700" : "bg-red-50 text-red-600")}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function Card({ title, now, before, prevLabel }: { title: string; now: H8Period; before: H8Period; prevLabel: string }) {
  const span = (p: H8Period) => p.from && p.to ? `${shortDate(p.from)} – ${shortDate(p.to)}` : "—"
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">{title}</div>
        <Delta now={now.gross} before={before.gross} />
      </div>
      <div className="mt-1 font-display text-[22px] font-semibold tabular-nums tracking-tight text-stone-900">{money(now.gross, { compact: true })}</div>
      <div className="text-[10.5px] tabular-nums text-stone-400">{num(now.tickets)} tickets · {span(now)}</div>
      <div className="mt-2 flex items-baseline justify-between border-t border-stone-100 pt-2 text-[11px]">
        <span className="text-stone-400">{prevLabel}</span>
        <span className="tabular-nums text-stone-600">{money(before.gross, { compact: true })} <span className="text-stone-300">· {num(before.tickets)}</span></span>
      </div>
      <div className="text-[10px] tabular-nums text-stone-300">{span(before)}</div>
    </div>
  )
}

/** Rolling revenue comparisons. Windows are anchored to the latest sale date
 *  rather than today, so a closed week does not read as a collapse. */
export function PeriodCards({ periods }: { periods: { last7: H8Period; prev7: H8Period; last30: H8Period; prev30: H8Period; mtd: H8Period; prevMtd: H8Period } }) {
  return (
    <div className="mb-5 grid gap-3 md:grid-cols-3">
      <Card title="Last 7 days"   now={periods.last7}  before={periods.prev7}   prevLabel="Previous 7 days" />
      <Card title="Last 30 days"  now={periods.last30} before={periods.prev30}  prevLabel="Previous 30 days" />
      <Card title="Month to date" now={periods.mtd}    before={periods.prevMtd} prevLabel="Same days last month" />
    </div>
  )
}
