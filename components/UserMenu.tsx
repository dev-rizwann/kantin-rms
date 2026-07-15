"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useRef, useEffect } from "react"
import clsx from "clsx"
import type { KantinMeta } from "@/lib/kantins"

export function UserMenu({ dark = false, kantin }: { dark?: boolean; kantin?: KantinMeta }) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  if (!session) return null
  const initials = (session.user.name || session.user.email || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex w-full items-center gap-2 rounded-xl border px-2 py-2 text-sm transition-all",
          dark
            ? "border-white/10 bg-black/[0.07] text-white/85 hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
            : "border-transparent text-stone-700 hover:bg-stone-100",
        )}
      >
        <span
          className={clsx(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold",
            dark ? "bg-white/95 text-coral-700 shadow-sm" : "bg-coral-100 text-coral-800",
          )}
        >
          {initials}
        </span>
        <span className={clsx("sidebar-user-copy min-w-0 flex-1 text-left", !dark && "hidden md:block")}>
          <span className={clsx("block truncate text-[11.5px] font-semibold leading-tight", dark ? "text-white" : "text-stone-800")}>{session.user.name || session.user.email}</span>
          {kantin && (
            <span className="mt-0.5 flex items-center gap-1.5 truncate text-[9.5px] leading-tight text-white/55">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-300 shadow-[0_0_6px_rgba(177,218,124,.65)]" />
              {kantin.short} Kantin · {kantin.city}
            </span>
          )}
        </span>
        <span className="ml-auto text-xs opacity-50">▾</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
          <div className="border-b border-stone-100 px-3 py-2">
            <div className="text-sm font-medium text-stone-900">{session.user.name}</div>
            <div className="text-xs text-stone-500">{session.user.email}</div>
            <div className="mt-1 text-xs text-stone-400">Role: {session.user.role}</div>
          </div>
          {session.user.role === "ADMIN" && (
            <a
              href="/admin/users"
              className="block px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              User management
            </a>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
