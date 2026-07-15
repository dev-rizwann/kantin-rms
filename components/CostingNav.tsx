"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"

const items = [
  ["/h8/costing", "Dashboard", "01"],
  ["/h8/costing/ingredients", "Ingredients", "02"],
  ["/h8/costing/semis", "Semi-finished", "03"],
  ["/h8/costing/recipes", "Recipes", "04"],
  ["/h8/costing/usage", "Usage", "05"],
] as const

export function CostingNav() {
  const path = usePathname() ?? ""
  return (
    <nav className="mb-6 flex flex-wrap gap-1.5 rounded-2xl border border-stone-200/90 bg-white/90 p-1.5 shadow-[0_8px_28px_rgba(120,96,70,.06)] backdrop-blur-sm">
      {items.map(([href, label, index]) => {
        const active = href === "/h8/costing" ? path === href : path.startsWith(href)
        return <Link key={href} href={href} className={clsx("group flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] font-semibold transition-all", active ? "bg-stone-900 text-white shadow-[0_7px_16px_rgba(28,25,23,.14)]" : "text-stone-500 hover:bg-stone-50 hover:text-stone-900")}><span className={clsx("text-[9px] tabular-nums tracking-wider", active ? "text-leaf-300" : "text-stone-300 group-hover:text-coral-400")}>{index}</span>{label}</Link>
      })}
    </nav>
  )
}
