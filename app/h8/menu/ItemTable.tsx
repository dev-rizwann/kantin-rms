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
  const input = "px-3 py-2 border border-slate-300 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className={input + " w-56"} placeholder="Search items…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={input} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex overflow-hidden rounded-md border border-slate-300 text-[12px]">
          {([["all", "All"], ["active", "Active"], ["dead", "Dead stock"], ["cancels", "Has cancels"]] as [Filter, string][]).map(([f, l]) => (
            <button key={f} onClick={() => setFilter(f)} className={clsx("px-2.5 py-2", filter === f ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>{l}</button>
          ))}
        </div>
        <span className="ml-auto text-[11px] tabular-nums text-slate-500">{rows.length} shown</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead className="bg-slate-50">
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
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-500">No items match</td></tr>
            ) : rows.map((i) => (
              <tr key={i.itemId} className="hover:bg-slate-50">
                <td className="px-3 py-1.5"><span className="font-medium text-slate-900">{i.item}</span></td>
                <td className="px-3 py-1.5 text-slate-500">{i.category ?? "—"}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">{money(i.price)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">{i.qty ? num(i.qty) : <span className="text-slate-300">0</span>}</td>
                <td className="relative px-3 py-1.5 text-right font-medium tabular-nums text-slate-900">
                  {i.sales > 0 && <span className="absolute inset-y-1 left-1 rounded-sm bg-blue-100" style={{ width: `${Math.max(2, (i.sales / maxSales) * 100)}%` }} />}
                  <span className="relative">{i.sales ? money(i.sales) : "—"}</span>
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{i.cancels ? <span className="text-red-600">{num(i.cancels)}</span> : <span className="text-slate-300">—</span>}</td>
                <td className="px-3 py-1.5 text-slate-500">{i.lastSold ? shortDate(i.lastSold) : <span className="text-amber-600">never</span>}</td>
                <td className="px-3 py-1.5"><Badge tone={i.status === "Active" ? "ok" : "neutral"}>{i.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={() => setShowCatalog((s) => !s)} className="mt-3 text-[12px] text-blue-600 hover:underline">
        {showCatalog ? "Hide" : "Show"} catalog detail (price / tax / on-sale)
      </button>
      {showCatalog && (
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-[13px]">
            <thead className="bg-slate-50">
              <tr><Th>Item</Th><Th>Category</Th><Th numeric>Price</Th><Th numeric>Tax %</Th><Th>On sale</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...items].sort((a, b) => a.item.localeCompare(b.item)).map((i) => (
                <tr key={i.itemId} className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-medium text-slate-900">{i.item}</td>
                  <td className="px-3 py-1.5 text-slate-500">{i.category ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{money(i.price)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">{i.tax ? `${i.tax}%` : "—"}</td>
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
        "border-b border-slate-200 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 whitespace-nowrap",
        numeric ? "text-right" : "text-left",
        onClick && "cursor-pointer select-none hover:text-slate-700",
        active && "text-blue-600",
      )}
    >
      {children}{active && " ▼"}
    </th>
  )
}
