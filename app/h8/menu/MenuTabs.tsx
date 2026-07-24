"use client"

import { useState } from "react"
import clsx from "clsx"
import { LedgerTable } from "@/components/ui"
import { money, num } from "@/lib/format"
import type { H8MenuCategory, H8MenuItem } from "@/lib/h8-live"
import { ItemTable } from "./ItemTable"

type Tab = "categories" | "items"

export function MenuTabs({ categories, items }: { categories: H8MenuCategory[]; items: H8MenuItem[] }) {
  const [tab, setTab] = useState<Tab>("categories")
  const [category, setCategory] = useState("")
  const maxCatSales = Math.max(1, ...categories.map((c) => c.sales))

  const openCategory = (c: string) => { setCategory(c); setTab("items") }

  return (
    <div>
      <div className="mb-4 flex items-center gap-1 border-b border-stone-200">
        <TabButton active={tab === "categories"} onClick={() => setTab("categories")} label="Categories" count={categories.length} />
        <TabButton active={tab === "items"} onClick={() => setTab("items")} label="Items" count={items.length} />
      </div>

      {tab === "categories" ? (
        <LedgerTable
          rows={categories}
          rank
          cols={[
            { key: "cat", header: "Category", render: (r) => <button type="button" onClick={() => openCategory(r.category)} className="font-medium text-stone-900 hover:text-coral-700 hover:underline">{r.category}</button> },
            { key: "items", header: "Items", numeric: true, muted: true, render: (r) => num(r.items) },
            { key: "qty", header: "Qty", numeric: true, render: (r) => num(r.qty) },
            { key: "sales", header: "Sales", numeric: true, lead: true, render: (r) => money(r.sales), bar: (r) => r.sales / maxCatSales },
          ]}
        />
      ) : (
        <ItemTable items={items} category={category} onCategoryChange={setCategory} />
      )}
    </div>
  )
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors",
        active ? "border-coral-600 text-coral-700" : "border-transparent text-stone-400 hover:text-stone-700",
      )}
    >
      {label}
      <span className={clsx("rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums", active ? "bg-coral-100 text-coral-700" : "bg-stone-100 text-stone-400")}>{num(count)}</span>
    </button>
  )
}
