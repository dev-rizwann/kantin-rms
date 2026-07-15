"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"

const items = [
  ["/h8/costing", "Dashboard"],
  ["/h8/costing/ingredients", "Ingredients"],
  ["/h8/costing/semis", "Semi-finished"],
  ["/h8/costing/recipes", "Recipes"],
  ["/h8/costing/usage", "Theoretical usage"],
] as const

export function CostingNav() {
  const path = usePathname() ?? ""
  return (
    <nav className="mb-6 flex flex-wrap gap-1 rounded-xl border border-stone-200 bg-white p-1.5 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      {items.map(([href, label]) => {
        const active = href === "/h8/costing" ? path === href : path.startsWith(href)
        return <Link key={href} href={href} className={clsx("rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors", active ? "bg-coral-600 text-white" : "text-stone-500 hover:bg-stone-50 hover:text-stone-900")}>{label}</Link>
      })}
    </nav>
  )
}
