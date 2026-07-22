"use client"

import { Fragment, useState } from "react"
import Link from "next/link"
import { money, num, timeOnly } from "@/lib/format"
import type { H8Order } from "@/lib/h8-live"

/** Ticket list for one day. Each order collapses to a single line — time,
 *  cashier, what was sold, total — and opens to its priced item lines. */
export function OrderList({ orders, fullDayHref }: { orders: H8Order[]; fullDayHref?: string }) {
  const [openOrder, setOpenOrder] = useState<number | null>(null)
  const [allOpen, setAllOpen] = useState(false)
  const [q, setQ] = useState("")

  if (!orders.length) return <div className="rounded-lg border border-stone-200 bg-white px-4 py-6 text-center text-[12px] text-stone-400">No tickets recorded on this date.</div>

  const term = q.trim().toLowerCase()
  const shown = term
    ? orders.filter((o) => o.lines.some((l) => l.item.toLowerCase().includes(term)) || String(o.checkoutId).includes(term) || (o.cashier ?? "").toLowerCase().includes(term))
    : orders
  const items = orders.reduce((s, o) => s + o.itemCount, 0)
  const gross = orders.reduce((s, o) => (o.void ? s : s + o.total), 0)

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="font-semibold text-stone-700">{num(orders.length)} orders</span>
        <span className="text-stone-300">·</span><span className="text-stone-500">{num(items)} items</span>
        <span className="text-stone-300">·</span><span className="text-stone-500">{money(gross)}</span>
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by item, cashier or ticket #…"
          className="ml-1 h-6 min-w-52 flex-1 rounded-md border border-stone-200 bg-white px-2 text-[11px] outline-none focus:border-coral-300"
        />
        <button type="button" onClick={() => { setAllOpen((v) => !v); setOpenOrder(null) }} className="rounded border border-stone-200 bg-white px-2 py-[2px] text-[10px] font-semibold text-stone-600">
          {allOpen ? "Collapse items" : "Show all items"}
        </button>
        {fullDayHref && <Link href={fullDayHref} className="text-[10.5px] font-semibold text-coral-700 hover:underline">Full day report →</Link>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full border-collapse text-[11.5px] leading-tight">
          <thead><tr className="border-b border-stone-200 bg-stone-50 text-[9.5px] uppercase tracking-wide text-stone-400">
            <th className="w-5 px-1.5 py-1" />
            <th className="px-2 py-1 text-left">Time</th>
            <th className="px-2 py-1 text-left">Ticket</th>
            <th className="px-2 py-1 text-left">Cashier</th>
            <th className="px-2 py-1 text-left">What was sold</th>
            <th className="px-2 py-1 text-right">Qty</th>
            <th className="px-2 py-1 text-left">Paid by</th>
            <th className="px-2 py-1 text-right">Total</th>
          </tr></thead>
          <tbody className="divide-y divide-stone-100">
            {shown.length === 0 && <tr><td colSpan={8} className="px-2 py-4 text-center text-[11px] text-stone-400">Nothing matches “{q}”.</td></tr>}
            {shown.map((o) => {
              const expanded = allOpen || openOrder === o.checkoutId
              const summary = o.lines.map((l) => (l.qty > 1 ? `${l.qty}× ` : "") + l.item).join(", ")
              return (
                <Fragment key={o.checkoutId}>
                  <tr onClick={() => setOpenOrder(expanded && !allOpen ? null : o.checkoutId)} className={"cursor-pointer " + (expanded ? "bg-coral-50/50" : "hover:bg-stone-50")}>
                    <td className="px-1.5 py-[3px] text-center text-[9px] text-stone-400">{expanded ? "▾" : "▸"}</td>
                    <td className="whitespace-nowrap px-2 py-[3px] tabular-nums text-stone-500">{timeOnly(o.closeTime)}</td>
                    <td className="whitespace-nowrap px-2 py-[3px] tabular-nums text-stone-400">#{o.checkoutId}{o.void && <span className="ml-1 font-semibold text-amber-600">VOID</span>}</td>
                    <td className="whitespace-nowrap px-2 py-[3px] text-stone-600">{o.cashier ?? "—"}{o.customer && <span className="ml-1 text-stone-400">· {o.customer}</span>}</td>
                    <td className="max-w-0 truncate px-2 py-[3px] text-stone-700" title={summary}>{summary || <span className="text-stone-300">no items</span>}</td>
                    <td className="whitespace-nowrap px-2 py-[3px] text-right tabular-nums text-stone-400">{num(o.itemCount)}</td>
                    <td className="whitespace-nowrap px-2 py-[3px] text-stone-500">{o.payments.join(" + ") || "—"}</td>
                    <td className={"whitespace-nowrap px-2 py-[3px] text-right font-medium tabular-nums " + (o.void ? "text-stone-300 line-through" : "text-stone-900")}>{money(o.total)}</td>
                  </tr>
                  {expanded && <tr><td colSpan={8} className="bg-white p-0">
                    <div className="border-y border-stone-100 px-8 py-1.5">
                      <table className="w-full text-[11px] leading-tight">
                        <tbody>
                          {o.lines.map((l, i) => (
                            <tr key={i}>
                              <td className="w-8 py-[2px] pr-2 tabular-nums text-stone-400">{l.qty}×</td>
                              <td className="py-[2px] pr-2 text-stone-800">{l.item}{l.canceled > 0 && <span className="ml-1.5 text-[9.5px] font-semibold uppercase text-red-500">{l.canceled} cancelled</span>}</td>
                              <td className="py-[2px] pr-2 text-stone-400">{l.category ?? "—"}</td>
                              <td className="py-[2px] pr-2 text-right tabular-nums text-stone-400">{money(l.unitPrice)}</td>
                              <td className="w-20 py-[2px] text-right tabular-nums font-medium text-stone-800">{money(l.lineTotal)}</td>
                            </tr>
                          ))}
                          <tr className="border-t border-stone-100">
                            <td colSpan={3} className="py-[3px] text-[10px] uppercase tracking-wide text-stone-400">Items</td>
                            <td />
                            <td className="py-[3px] text-right tabular-nums font-semibold text-stone-700">{money(o.itemsTotal)}</td>
                          </tr>
                          {Math.abs(o.total - o.itemsTotal) > 0.009 && <tr>
                            <td colSpan={3} className="py-[2px] text-[10px] uppercase tracking-wide text-stone-400">{o.rounding ? "Rounding" : "Ticket vs items"}</td>
                            <td />
                            <td className="py-[2px] text-right tabular-nums text-stone-500">{money(o.total - o.itemsTotal)}</td>
                          </tr>}
                        </tbody>
                      </table>
                    </div>
                  </td></tr>}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
