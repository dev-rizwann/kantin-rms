"use client"

import { useMemo, useState } from "react"
import clsx from "clsx"
import type { H8MenuItem } from "@/lib/h8-live"
import { money, num, shortDate } from "@/lib/format"
import { Badge } from "@/components/ui"

type SortKey = "sales" | "qty" | "item" | "lastSold" | "cancels"
type Filter = "all" | "active" | "dead" | "cancels"

export function ItemTable({ items }: { items: H8MenuItem[] }) {
  const [q, setQ] = useState("")
  const [cat, setCat] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [sort, setSort] = useState<SortKey>("sales")
  const [showCatalog, setShowCatalog] = useState(false)

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort() as string[],
    [items],
  )

  const rows = useMemo(() => {
    let r = items
    if (q.trim()) {
      const s = q.toLowerCase().trim()
      r = r.filter((i) => i.item.toLowerCase().includes(s))
    }
    if (cat) r = r.filter((i) => i.category === cat)
    if (filter === "active") r = r.filter((i) => i.status === "Active")
    if (filter === "dead") r = r.filter((i) => i.qty === 0)
    if (filter === "cancels") r = r.filter((i) => i.cancels > 0)
    const dir = sort === "item" ? 1 : -1
    return [...r].sort((a, b) => {
      if (sort === "item") return a.item.localeCompare(b.item)
      if (sort === "lastSold") return ((a.lastSold ?? "") < (b.lastSold ?? "") ? -1 : 1) * dir
      return ((a[sort] as number) - (b[sort] as number)) * dir
    })
  }, [items, q, cat, filter, sort])

  const maxSales = Math.max(1, ...items.map((i) => i.sales))
  const input =
    "rounded-lg border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-800 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className={input + " w-56"} placeholder="Search items…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={input} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex overflow-hidden rounded-lg border border-stone-200 bg-white text-[12px]">
          {([["all", "All"], ["active", "Active"], ["dead", "Dead stock"], ["cancels", "Has cancels"]] as [Filter, string][]).map(([f, l]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-2.5 py-2 transition-colors",
                filter === f ? "bg-emerald-700 font-medium text-white" : "text-stone-500 hover:bg-stone-50 hover:text-stone-800",
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[11px] tabular-nums text-stone-400">{rows.length} shown</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <Th onClick={() => setSort("item")} active={sort === "item"}>Item</Th>
              <Th>Category</Th>
              <Th numeric>Price</Th>
              <Th numeric onClick={() => setSort("qty")} active={sort === "qty"}>Qty</Th>
              <Th numeric onClick={() => setSort("sales")} active={sort === "sales"}>Sales</Th>
              <Th numeric onClick={() => setSort("cancels")} active={sort === "cancels"}>Cancels</Th>
              <Th onClick={() => setSort("lastSold")} active={sort === "lastSold"}>Last sold</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-stone-500">No items match</td></tr>
            ) : rows.map((i) => (
              <tr key={i.itemId} className="transition-colors hover:bg-emerald-50/40">
                <td className="px-3 py-1.5"><span className="font-medium text-stone-900">{i.item}</span></td>
                <td className="px-3 py-1.5 text-stone-400">{i.category ?? "—"}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-stone-600">{money(i.price)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-stone-600">{i.qty ? num(i.qty) : <span className="text-stone-300">0</span>}</td>
                <td className="relative px-3 py-1.5 text-right font-medium tabular-nums text-stone-900">
                  {i.sales > 0 && <span className="absolute inset-y-[5px] left-1 rounded-[3px] bg-emerald-100/80" style={{ width: `${Math.max(2, (i.sales / maxSales) * 100)}%` }} />}
                  <span className="relative">{i.sales ? money(i.sales) : "—"}</span>
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{i.cancels ? <span className="font-medium text-red-600">{num(i.cancels)}</span> : <span className="text-stone-300">—</span>}</td>
                <td className="px-3 py-1.5 text-stone-500">{i.lastSold ? shortDate(i.lastSold) : <span className="font-medium text-amber-600">never</span>}</td>
                <td className="px-3 py-1.5"><Badge tone={i.status === "Active" ? "ok" : "neutral"}>{i.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={() => setShowCatalog((s) => !s)} className="mt-3 text-[12px] font-medium text-emerald-700 hover:underline">
        {showCatalog ? "Hide" : "Show"} catalog detail (price / tax / on-sale)
      </button>
      {showCatalog && (
        <div className="mt-2 overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr><Th>Item</Th><Th>Category</Th><Th numeric>Price</Th><Th numeric>Tax %</Th><Th>On sale</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {[...items].sort((a, b) => a.item.localeCompare(b.item)).map((i) => (
                <tr key={i.itemId} className="hover:bg-emerald-50/40">
                  <td className="px-3 py-1.5 font-medium text-stone-900">{i.item}</td>
                  <td className="px-3 py-1.5 text-stone-400">{i.category ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{money(i.price)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-stone-500">{i.tax ? `${i.tax}%` : "—"}</td>
                  <td className="px-3 py-1.5">{i.onSale}</td>
                  <td className="px-3 py-1.5"><Badge tone={i.status === "Active" ? "ok" : "neutral"}>{i.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children, numeric, onClick, active }: { children: React.ReactNode; numeric?: boolean; onClick?: () => void; active?: boolean }) {
  return (
    <th
      onClick={onClick}
      className={clsx(
        "border-b border-stone-200 bg-stone-50/80 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap",
        numeric ? "text-right" : "text-left",
        onClick && "cursor-pointer select-none",
        active ? "text-emerald-700" : "text-stone-400",
        onClick && !active && "hover:text-stone-600",
      )}
    >
      {children}{active && " ▼"}
    </th>
  )
}
