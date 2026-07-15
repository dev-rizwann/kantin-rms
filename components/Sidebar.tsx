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
  { sub: "/costing", label: "Recipe Costing", icon: "calculator" },
  { sub: "/inventory", label: "Inventory", icon: "archive" },
  { sub: "/grn", label: "GRN", icon: "clipboard" },
  { sub: "/vendors", label: "Vendors", icon: "truck" },
  { sub: "/products", label: "Products", icon: "package" },
  { sub: "/stock-take", label: "Stock Take", icon: "list" },
]

type IconName = "chart" | "tag" | "banknote" | "archive" | "clipboard" | "truck" | "package" | "list" | "calculator"

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
    calculator: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <rect x="7" y="5" width="10" height="4" rx="1" />
        <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" />
      </>
    ),
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      {paths[name]}
    </svg>
  )
}

export function Sidebar({ kantin, showCosting = false }: { kantin: KantinMeta; showCosting?: boolean }) {
  const path = usePathname() ?? ""
  const base = `/${kantin.slug}`

  function Item({ sub, label, icon }: NavItem) {
    const href = `${base}${sub}` || "/"
    const active = sub === "" ? path === base || path === base + "/" : path.startsWith(href)
    return (
      <Link
        href={href}
        className={clsx(
          "sidebar-item group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-all duration-200",
          active
            ? "bg-white/[0.18] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.15),0_6px_16px_rgba(92,27,18,.13)]"
            : "text-white/72 hover:translate-x-0.5 hover:bg-white/[0.09] hover:text-white",
        )}
      >
        {active && <span className="absolute -left-[7px] top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-leaf-300 shadow-[0_0_10px_rgba(177,218,124,.75)]" />}
        <span className={clsx("grid h-7 w-7 place-items-center rounded-lg border transition-all", active ? "border-white/15 bg-white/12 text-leaf-200" : "border-transparent bg-black/[0.055] text-white/55 group-hover:bg-white/10 group-hover:text-white/85")}>
          <Icon name={icon} />
        </span>
        <span className="sidebar-copy">{label}</span>
      </Link>
    )
  }

  return (
    <aside className="kantin-sidebar flex shrink-0 flex-col text-white">
      {/* Brand — the actual Kantin logo (its coral background blends into the sidebar) */}
      <div className="sidebar-brand px-4 pb-3 pt-5">
        <img
          src="/brand/kantin-logo.png"
          alt="Kantin — Fresh Choices, Happy Breaks"
          className="w-[176px] drop-shadow-[0_5px_12px_rgba(102,28,18,.14)]"
        />
        <div className="sidebar-brand-copy mt-1.5 flex items-center gap-2 px-1 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-white/52">
          <span className="h-px w-5 bg-leaf-300/70" /> Kitchen intelligence
        </div>
      </div>

      {/* Location card */}
      <div className="sidebar-location px-4">
        <Link
          href="/"
          className="group block rounded-2xl border border-white/18 bg-black/[0.075] px-3.5 py-3 backdrop-blur-sm transition-all hover:border-white/30 hover:bg-white/[0.1]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">Live location</span>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf-200 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf-300" />
            </span>
          </div>
          <div className="mt-1.5 flex items-end justify-between">
            <div><div className="font-display text-[15px] font-semibold text-white">{kantin.short} Kantin</div><div className="text-[10.5px] text-white/58">{kantin.city}</div></div>
            <span className="opacity-0 transition-opacity group-hover:opacity-100">all locations →</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav scrollbar-thin mt-5 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <div>
          <div className="sidebar-section-label px-2.5 pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-white/42">Reports</div>
          <div className="space-y-0.5">{reportsNav.map((i) => <Item key={i.sub} {...i} />)}</div>
        </div>
        <div>
          <div className="sidebar-section-label px-2.5 pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-white/42">Operations</div>
          <div className="space-y-0.5">{operationsNav.filter((i) => i.sub !== "/costing" || showCosting).map((i) => <Item key={i.sub} {...i} />)}</div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/15 bg-black/[0.055] px-3 py-3 backdrop-blur-sm">
        <UserMenu dark />
      </div>
    </aside>
  )
}
