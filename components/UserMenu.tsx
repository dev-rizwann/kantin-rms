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
          "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
          dark
            ? "text-slate-100 hover:bg-slate-800"
            : "text-slate-700 hover:bg-slate-100",
        )}
      >
        <span
          className={clsx(
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold",
            dark ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700",
          )}
        >
          {initials}
        </span>
        <span className="hidden md:block">{session.user.name || session.user.email}</span>
        <span className="text-xs opacity-60">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50">
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="text-sm font-medium text-slate-900">{session.user.name}</div>
            <div className="text-xs text-slate-500">{session.user.email}</div>
            <div className="text-xs text-slate-400 mt-1">Role: {session.user.role}</div>
          </div>
          {session.user.role === "ADMIN" && (
            <a
              href="/admin/users"
              className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              User management
            </a>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-left block px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
