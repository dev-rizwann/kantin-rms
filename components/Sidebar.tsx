"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"
import type { KantinMeta } from "@/lib/kantins"
import { UserMenu } from "./UserMenu"

type NavItem = { sub: string; label: string; icon: IconName }

const reportsNav: NavItem[] = [
  { sub: "", label: "Overview", icon: "chart" },
  { sub: "/menu", label: "Menu Performance", icon: "tag" },
  { sub: "/daily", label: "Daily & Cash", icon: "banknote" },
]

const operationsNav: NavItem[] = [
  { sub: "/inventory", label: "Inventory", icon: "archive" },
  { sub: "/grn", label: "GRN", icon: "clipboard" },
  { sub: "/vendors", label: "Vendors", icon: "truck" },
  { sub: "/products", label: "Products", icon: "package" },
  { sub: "/stock-take", label: "Stock Take", icon: "list" },
]

type IconName = "chart" | "tag" | "banknote" | "archive" | "clipboard" | "truck" | "package" | "list"

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    chart: (
      <>
        <line x1="5" y1="20" x2="5" y2="11" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="19" y1="20" x2="19" y2="14" />
      </>
    ),
    tag: (
      <>
        <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z" />
        <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
      </>
    ),
    banknote: (
      <>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.4" />
        <path d="M6 12h.01M18 12h.01" />
      </>
    ),
    archive: (
      <>
        <rect x="3" y="3" width="18" height="5" rx="1" />
        <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </>
    ),
    clipboard: (
      <>
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
        <path d="m9 13.5 2 2 4-4.5" />
      </>
    ),
    truck: (
      <>
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.6a1 1 0 0 0-.2-.6l-3.5-4.4a1 1 0 0 0-.8-.4H14" />
        <circle cx="17" cy="18" r="2" />
        <circle cx="7" cy="18" r="2" />
      </>
    ),
    package: (
      <>
        <path d="M11 21.7a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7z" />
        <path d="M3.3 7 12 12l8.7-5" />
        <line x1="12" y1="12" x2="12" y2="22" />
      </>
    ),
    list: (
      <>
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
        <line x1="9" y1="6" x2="20" y2="6" />
        <line x1="9" y1="12" x2="20" y2="12" />
        <line x1="9" y1="18" x2="20" y2="18" />
      </>
    ),
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      {paths[name]}
    </svg>
  )
}

export function Sidebar({ kantin }: { kantin: KantinMeta }) {
  const path = usePathname() ?? ""
  const base = `/${kantin.slug}`

  function Item({ sub, label, icon }: NavItem) {
    const href = `${base}${sub}` || "/"
    const active = sub === "" ? path === base || path === base + "/" : path.startsWith(href)
    return (
      <Link
        href={href}
        className={clsx(
          "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors",
          active
            ? "bg-white/[0.18] font-medium text-white"
            : "text-white/75 hover:bg-white/10 hover:text-white",
        )}
      >
        {active && <span className="absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-leaf-300" />}
        <span className={clsx(active ? "text-leaf-200" : "text-white/50 group-hover:text-white/80", "transition-colors")}>
          <Icon name={icon} />
        </span>
        {label}
      </Link>
    )
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-coral-500 text-white">
      {/* Brand — the actual Kantin logo (its coral background blends into the sidebar) */}
      <div className="px-4 pb-3 pt-5">
        <img
          src="/brand/kantin-logo.png"
          alt="Kantin — Fresh Choices, Happy Breaks"
          className="w-[186px]"
        />
      </div>

      {/* Location card */}
      <div className="px-4">
        <Link
          href="/"
          className="group block rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 transition-colors hover:border-white/40 hover:bg-white/[0.14]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-white">{kantin.short} Kantin</span>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf-200 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf-300" />
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between text-[11px] text-white/65">
            <span>{kantin.city}</span>
            <span className="opacity-0 transition-opacity group-hover:opacity-100">all locations →</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="mt-5 flex-1 space-y-6 overflow-y-auto px-4 pb-4">
        <div>
          <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Reports</div>
          <div className="space-y-0.5">{reportsNav.map((i) => <Item key={i.sub} {...i} />)}</div>
        </div>
        <div>
          <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Operations</div>
          <div className="space-y-0.5">{operationsNav.map((i) => <Item key={i.sub} {...i} />)}</div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/20 px-3 py-3">
        <UserMenu dark />
      </div>
    </aside>
  )
}
