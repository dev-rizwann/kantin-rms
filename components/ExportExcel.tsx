"use client"

import { useState } from "react"

function iso(d: Date) {
  return d.toISOString().slice(0, 10)
}

/** Date-range Excel export control (items-daily workbook). */
export function ExportExcel() {
  const today = new Date()
  const [from, setFrom] = useState(iso(new Date(today.getTime() - 29 * 86400_000)))
  const [to, setTo] = useState(iso(today))

  const input =
    "rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12.5px] text-stone-700 focus:border-coral-500 focus:outline-none focus:ring-2 focus:ring-coral-500/25"

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">Export Excel</span>
      <input type="date" className={input} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
      <span className="text-stone-400">→</span>
      <input type="date" className={input} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
      <a
        href={`/api/export/items-daily?from=${from}&to=${to}`}
        className="inline-flex items-center gap-1.5 rounded-lg bg-coral-600 px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-coral-700"
        download
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="m7 10 5 5 5-5" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download
      </a>
    </div>
  )
}
