"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"
import type { KantinMeta } from "@/lib/kantins"
import { UserMenu } from "./UserMenu"

const reportsNav: { sub: string; label: string }[] = [
  { sub: "", label: "Overview" },
  { sub: "/menu", label: "Menu Performance" },
  { sub: "/daily", label: "Daily & Cash" },
]

const operationsNav: { sub: string; label: string }[] = [
  { sub: "/inventory", label: "Inventory" },
  { sub: "/grn", label: "GRN" },
  { sub: "/vendors", label: "Vendors" },
  { sub: "/products", label: "Products" },
  { sub: "/stock-take", label: "Stock Take" },
]

export function Sidebar({ kantin }: { kantin: KantinMeta }) {
  const path = usePathname() ?? ""
  const base = `/${kantin.slug}`

  function Item({ sub, label }: { sub: string; label: string }) {
    const href = `${base}${sub}` || "/"
    const active = sub === "" ? path === base || path === base + "/" : path.startsWith(href)
    return (
      <Link
        href={href}
        className={clsx(
          "block rounded-md px-3 py-2 text-sm transition-colors",
          active ? "bg-blue-600 font-medium text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
        )}
      >
        {label}
      </Link>
    )
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col bg-slate-900 text-slate-100">
      <Link href="/" className="block border-b border-slate-800 px-5 py-4 transition-colors hover:bg-slate-800/50">
        <div className="text-[10px] font-medium uppercase tracking-widest text-slate-500">← All locations</div>
        <div className="mt-1 text-base font-bold tracking-tight">Kantin RMS</div>
        <div className="mt-0.5 text-xs text-slate-400">{kantin.short} · {kantin.city}</div>
      </Link>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        <div>
          <div className="px-3 pb-1 text-[10px] font-medium uppercase tracking-widest text-slate-500">Reports</div>
          <div className="space-y-0.5">{reportsNav.map((i) => <Item key={i.sub} {...i} />)}</div>
        </div>
        <div>
          <div className="px-3 pb-1 text-[10px] font-medium uppercase tracking-widest text-slate-500">Operations</div>
          <div className="space-y-0.5">{operationsNav.map((i) => <Item key={i.sub} {...i} />)}</div>
        </div>
      </nav>

      <div className="border-t border-slate-800 px-3 py-3">
        <UserMenu dark />
      </div>
    </aside>
  )
}
