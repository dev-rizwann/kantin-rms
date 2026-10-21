import React from "react"
import Link from "next/link"
import type { KantinMeta } from "@/lib/kantins"
import type { H8LandingSummary } from "@/lib/h8-live"
import { money, num, shortDate } from "@/lib/format"

/** Portal access is independent of the first real trading date. */
export function LocationCard({ kantin: k, reportingLive, data }: {
  kantin: KantinMeta
  reportingLive: boolean
  data: H8LandingSummary | null
}) {
  return (
    <Link
      href={`/${k.slug}`}
      aria-label={`Open ${k.short} dashboard`}
      className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-all hover:-translate-y-0.5 hover:border-coral-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-stone-400">{k.city}</div>
          <div className="mt-1 font-display text-xl font-semibold tracking-tight text-stone-900">{k.short}</div>
          <div className="mt-0.5 text-xs text-stone-500">{k.fullAddress}</div>
        </div>
        {reportingLive ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-leaf-50 px-2.5 py-0.5 text-xs font-medium text-leaf-800 ring-1 ring-inset ring-leaf-600/25">
            <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" />
            Live
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-coral-50 px-2.5 py-0.5 text-xs font-medium text-coral-700 ring-1 ring-inset ring-coral-200">Portal ready</span>
        )}
      </div>

      {reportingLive && data ? (
        <div className="mt-5 flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-stone-400">Gross sales</div>
              <div className="text-lg font-semibold tabular-nums tracking-tight text-stone-900">{money(data.totalGross, { compact: true })}</div>
            </div>
            <div>
              <div className="text-xs text-stone-400">Tickets</div>
              <div className="text-lg font-semibold tabular-nums tracking-tight text-stone-900">{num(data.totalTickets)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-stone-400">Days of sales</div>
              <div className="text-sm tabular-nums text-stone-600">{num(data.daysWithSales)}</div>
            </div>
            <div>
              <div className="text-xs text-stone-400">Last sale</div>
              <div className="text-sm text-stone-600">{shortDate(data.lastSaleDate)}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex-1 text-sm leading-relaxed text-stone-500">
          {k.slug === "kashmir" && !reportingLive
            ? "Your dashboard is available. Sales reporting awaits the first real trading date; QA and test sales stay excluded."
            : "No POS sales data synced yet. Eligible sales will appear here after sync."}
        </div>
      )}
      <div className="mt-5 border-t border-stone-100 pt-3 text-xs font-medium text-coral-700">Open dashboard →</div>
    </Link>
  )
}
