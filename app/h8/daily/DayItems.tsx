"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { money, num } from "@/lib/format"
import type { H8DayItems } from "@/lib/h8-live"

type Sort = "sales" | "qty" | "item"

/** Item-wise summary for one day: item, quantity, amount. Stays readable on a
 *  500-ticket day where the order-by-order view would not. */
export function DayItems({ data, fullDayHref }: { data: H8DayItems; fullDayHref?: string }) {
  const [q, setQ] = useState("")
  const [sort, setSort] = useState<Sort>("sales")

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    const r = term ? data.items.filter((i) => i.item.toLowerCase().includes(term) || (i.category ?? "").toLowerCase().includes(term)) : data.items
    return [...r].sort((a, b) => sort === "item" ? a.item.localeCompare(b.item) : (b[sort] as number) - (a[sort] as number))
  }, [data.items, q, sort])

  if (!data.items.length) return <div className="rounded-lg border border-stone-200 bg-white px-4 py-6 text-center text-[12px] text-stone-400">No items sold on this date.</div>

  const maxSales = Math.max(1, ...data.items.map((i) => i.sales))
  const th = (label: string, key: Sort, numeric?: boolean) => (
    <th onClick={() => setSort(key)} className={"cursor-pointer select-none px-2.5 py-1.5 font-semibold " + (numeric ? "text-right" : "text-left") + (sort === key ? " text-coral-700" : " hover:text-stone-600")}>{label}{sort === key ? " ▼" : ""}</th>
  )

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="font-semibold text-stone-700">{num(data.distinctItems)} items</span>
        <span className="text-stone-300">·</span><span className="text-stone-500">{num(data.totalQty)} sold</span>
        <span className="text-stone-300">·</span><span className="text-stone-500">{money(data.totalSales)}</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter items…" className="ml-1 h-6 min-w-48 flex-1 rounded-md border border-stone-200 bg-white px-2 text-[11px] outline-none focus:border-coral-300" />
        {fullDayHref && <Link href={fullDayHref} className="text-[10.5px] font-semibold text-coral-700 hover:underline">Full day report →</Link>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full border-collapse text-[11.5px] leading-tight">
          <thead><tr className="border-b border-stone-200 bg-stone-50 text-[9.5px] uppercase tracking-wide text-stone-400">
            {th("Item", "item")}<th className="px-2.5 py-1.5 text-left font-semibold">Category</th>{th("Qty", "qty", true)}{th("Amount", "sales", true)}
          </tr></thead>
          <tbody className="divide-y divide-stone-100">
            {rows.length === 0 && <tr><td colSpan={4} className="px-2.5 py-4 text-center text-[11px] text-stone-400">Nothing matches “{q}”.</td></tr>}
            {rows.map((i) => (
              <tr key={i.item + (i.category ?? "")} className="hover:bg-stone-50">
                <td className="px-2.5 py-[3px] font-medium text-stone-800">{i.item}{i.canceled > 0 && <span className="ml-1.5 text-[9.5px] font-semibold uppercase text-red-500">{i.canceled} cancelled</span>}</td>
                <td className="px-2.5 py-[3px] text-stone-400">{i.category ?? "—"}</td>
                <td className="px-2.5 py-[3px] text-right tabular-nums text-stone-600">{num(i.qty)}</td>
                <td className="relative px-2.5 py-[3px] text-right font-medium tabular-nums text-stone-900">
                  {i.sales > 0 && <span className="absolute inset-y-[3px] left-1 rounded-[3px] bg-leaf-200/50" style={{ width: `${Math.max(2, (i.sales / maxSales) * 100)}%` }} />}
                  <span className="relative">{money(i.sales)}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-stone-200 bg-stone-50/70 font-semibold text-stone-700">
            <td className="px-2.5 py-1.5" colSpan={2}>Total</td>
            <td className="px-2.5 py-1.5 text-right tabular-nums">{num(data.totalQty)}</td>
            <td className="px-2.5 py-1.5 text-right tabular-nums">{money(data.totalSales)}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  )
}
