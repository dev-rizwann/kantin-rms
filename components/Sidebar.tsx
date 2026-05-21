"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"

const nav: { href: string; label: string; icon: string }[] = [
  { href: "/", label: "Overview", icon: "📊" },
  { href: "/daily", label: "Daily / Z Report", icon: "📅" },
  { href: "/items", label: "Items", icon: "🍔" },
  { href: "/categories", label: "Categories", icon: "📂" },
  { href: "/cashiers", label: "Cashiers", icon: "👤" },
  { href: "/customers", label: "Customers", icon: "🧾" },
  { href: "/payments", label: "Payments", icon: "💳" },
  { href: "/duplicates", label: "Duplicates", icon: "♻️" },
  { href: "/catalog", label: "Catalog", icon: "📖" },
]

export function Sidebar({ meta }: { meta: { last_sale_date: string | null; generated_at: string } }) {
  const path = usePathname()
  return (
    <aside className="w-64 shrink-0 bg-slate-900 text-slate-100 flex flex-col">
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="text-lg font-bold tracking-tight">MutfakPos</div>
        <div className="text-xs text-slate-400 mt-0.5">Reporting Dashboard</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const active = item.href === "/" ? path === "/" : path?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "block px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-blue-600 text-white font-medium"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-400 space-y-1">
        <div>Data through: <span className="text-slate-200">{meta.last_sale_date ?? "—"}</span></div>
        <div>Generated: <span className="text-slate-200">{meta.generated_at.slice(0, 16).replace("T", " ")}</span></div>
      </div>
    </aside>
  )
}
