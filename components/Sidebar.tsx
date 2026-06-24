"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"
import type { KantinMeta } from "@/lib/kantins"

const nav: { sub: string; label: string; icon: string }[] = [
  { sub: "", label: "Overview", icon: "📊" },
  { sub: "/daily", label: "Daily / Z Report", icon: "📅" },
  { sub: "/items", label: "Items", icon: "🍔" },
  { sub: "/categories", label: "Categories", icon: "📂" },
  { sub: "/cashiers", label: "Cashiers", icon: "👤" },
  { sub: "/customers", label: "Customers", icon: "🧾" },
  { sub: "/payments", label: "Payments", icon: "💳" },
  { sub: "/duplicates", label: "Duplicates", icon: "♻️" },
  { sub: "/catalog", label: "Catalog", icon: "📖" },
]

export function Sidebar({
  kantin,
  meta,
}: {
  kantin: KantinMeta
  meta: { last_sale_date: string | null; generated_at: string }
}) {
  const path = usePathname() ?? ""
  const base = `/${kantin.slug}`

  return (
    <aside className="w-64 shrink-0 bg-slate-900 text-slate-100 flex flex-col">
      <Link
        href="/"
        className="block px-5 py-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
      >
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">
          ← All locations
        </div>
        <div className="text-base font-bold tracking-tight mt-1">Kantin RMS</div>
        <div className="text-xs text-slate-400 mt-0.5">
          {kantin.short} · {kantin.city}
        </div>
      </Link>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const href = `${base}${item.sub}` || "/"
          const active =
            item.sub === ""
              ? path === base || path === base + "/"
              : path.startsWith(href)
          return (
            <Link
              key={item.sub || "/"}
              href={href}
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
        <div>
          Data through:{" "}
          <span className="text-slate-200">{meta.last_sale_date ?? "—"}</span>
        </div>
        <div>
          Generated:{" "}
          <span className="text-slate-200">
            {meta.generated_at.slice(0, 16).replace("T", " ")}
          </span>
        </div>
      </div>
    </aside>
  )
}
