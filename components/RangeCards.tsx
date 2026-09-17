import { money, num, shortDate } from "@/lib/format"
import type { H8RangeTotals } from "@/lib/h8-live"

function Card({ title, value, sub, tone = "default" }: { title: string; value: string; sub?: string; tone?: "default" | "warn" }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">{title}</div>
      <div className={"mt-1 font-display text-[22px] font-semibold tabular-nums tracking-tight " + (tone === "warn" ? "text-amber-600" : "text-stone-900")}>{value}</div>
      {sub && <div className="text-[10.5px] tabular-nums text-stone-400">{sub}</div>}
    </div>
  )
}

/** The numbers for whatever the date filter currently selects. With no filter
 *  this is the whole synced history, and the label says so. */
export function RangeCards({ totals }: { totals: H8RangeTotals }) {
  const filtered = !!(totals.from || totals.to)
  const span = totals.first && totals.last ? `${shortDate(totals.first)} – ${shortDate(totals.last)}` : "no sales in this range"
  const pct = (v: number) => (totals.gross > 0 ? `${((v / totals.gross) * 100).toFixed(0)}% of revenue` : undefined)
  const avgTicket = totals.tickets > 0 ? totals.gross / totals.tickets : 0
  const perDay = totals.days > 0 ? totals.gross / totals.days : 0

  return (
    <div className="mb-5">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 text-[11px]">
        <span className="font-semibold uppercase tracking-[0.12em] text-stone-400">{filtered ? "Selected range" : "All time"}</span>
        <span className="tabular-nums text-stone-500">{span}</span>
        {totals.days > 0 && <span className="text-stone-400">· {num(totals.days)} selling days</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <Card title="Revenue" value={money(totals.gross, { compact: true })} sub={`${num(totals.tickets)} tickets · avg ${money(avgTicket)}`} />
        <Card title="Per selling day" value={money(perDay, { compact: true })} sub={totals.days > 0 ? `${num(Math.round(totals.tickets / totals.days))} tickets / day` : undefined} />
        <Card title="Cash" value={money(totals.cash, { compact: true })} sub={pct(totals.cash)} />
        <Card title="Credit" value={money(totals.credit, { compact: true })} sub={pct(totals.credit)} />
        <Card title="Food Panda" value={money(totals.foodPanda, { compact: true })} sub={pct(totals.foodPanda)} />
        <Card title="Voids / cancels" value={`${num(totals.voids)} / ${num(totals.cancels)}`} sub={totals.refunds > 0 ? `${num(totals.refunds)} refunds` : "tickets / item lines"} tone={totals.voids + totals.cancels > 0 ? "warn" : "default"} />
      </div>
    </div>
  )
}
