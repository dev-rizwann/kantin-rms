"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useRef, useEffect } from "react"
import clsx from "clsx"

export function UserMenu({ dark = false }: { dark?: boolean }) {
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
          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
          dark
            ? "text-stone-300 hover:bg-white/[0.06] hover:text-white"
            : "text-stone-700 hover:bg-stone-100",
        )}
      >
        <span
          className={clsx(
            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
            dark ? "bg-emerald-500 text-ink" : "bg-emerald-100 text-emerald-800",
          )}
        >
          {initials}
        </span>
        <span className="hidden truncate md:block">{session.user.name || session.user.email}</span>
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
