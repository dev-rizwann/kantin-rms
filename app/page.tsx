import Link from "next/link"
import clsx from "clsx"
import { kantinList } from "@/lib/kantins"
import { money, num, shortDate } from "@/lib/format"
import { requireSession } from "@/lib/session"
import { UserMenu } from "@/components/UserMenu"
import { getH8LandingSummary } from "@/lib/h8-live"

export const dynamic = "force-dynamic"

export default async function LandingPage() {
  const session = await requireSession()
  const h8 = await getH8LandingSummary()

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 md:px-12 py-6 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-500 font-medium">IESPL</div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-1">Kantin RMS</h1>
            <p className="text-slate-500 mt-2 text-sm">Reporting &amp; management across all locations.</p>
          </div>
          <UserMenu />
        </div>
      </header>

      <section className="flex-1 px-6 md:px-12 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Locations</h2>
            <span className="text-xs text-slate-500">
              {kantinList.filter((k) => k.status === "live").length} live · {kantinList.filter((k) => k.status === "coming-soon").length} coming soon
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {kantinList.map((k) => {
              const isLive = k.status === "live"
              const data = k.slug === "h8" ? h8 : null
              return (
                <Link
                  key={k.slug}
                  href={`/${k.slug}`}
                  className={clsx(
                    "block bg-white rounded-xl border shadow-sm p-6 transition-all",
                    isLive ? "border-slate-200 hover:border-blue-400 hover:shadow-md" : "border-slate-200 opacity-80 hover:opacity-100",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{k.city}</div>
                      <div className="text-xl font-bold text-slate-900 mt-1">{k.short}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{k.fullAddress}</div>
                    </div>
                    {isLive ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">Live</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">Coming soon</span>
                    )}
                  </div>

                  {isLive && data ? (
                    <div className="mt-5 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-slate-500">Gross sales</div>
                          <div className="text-lg font-semibold text-slate-900 tabular-nums">{money(data.totalGross, { compact: true })}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Tickets</div>
                          <div className="text-lg font-semibold text-slate-900 tabular-nums">{num(data.totalTickets)}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-slate-500">Days of sales</div>
                          <div className="text-sm text-slate-700 tabular-nums">{num(data.daysWithSales)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Last sale</div>
                          <div className="text-sm text-slate-700">{shortDate(data.lastSaleDate)}</div>
                        </div>
                      </div>
                      <div className="pt-3 mt-3 border-t border-slate-100 text-xs text-blue-600 font-medium">Open dashboard →</div>
                    </div>
                  ) : (
                    <div className="mt-5 pt-5 border-t border-slate-100 text-sm text-slate-500">
                      No POS data synced yet. This location will go live once its system is connected.
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="px-6 md:px-12 py-6 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <div>Kantin RMS · IESPL · Signed in as {session.user.email}</div>
          <div>Data freshness depends on each location&apos;s POS sync schedule.</div>
        </div>
      </footer>
    </main>
  )
}
