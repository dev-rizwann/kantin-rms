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
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-stone-200 bg-white px-6 py-6 md:px-12">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src="/brand/kantin-logo.png" alt="Kantin — Fresh Choices, Happy Breaks" className="h-14 w-auto rounded-xl" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-coral-700">IESPL</div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-stone-900 md:text-3xl">Kantin RMS</h1>
              <p className="mt-0.5 text-sm text-stone-500">Reporting &amp; management across all locations.</p>
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      <section className="flex-1 px-6 py-10 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight text-stone-800">Locations</h2>
            <span className="text-xs text-stone-500">
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
                    "block rounded-2xl border bg-white p-6 shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-all",
                    isLive ? "border-stone-200 hover:-translate-y-0.5 hover:border-coral-400 hover:shadow-md" : "border-stone-200 opacity-75 hover:opacity-100",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-stone-400">{k.city}</div>
                      <div className="mt-1 font-display text-xl font-semibold tracking-tight text-stone-900">{k.short}</div>
                      <div className="mt-0.5 text-xs text-stone-500">{k.fullAddress}</div>
                    </div>
                    {isLive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-50 px-2.5 py-0.5 text-xs font-medium text-leaf-800 ring-1 ring-inset ring-leaf-600/25">
                        <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" />
                        Live
                      </span>
                    ) : (
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500">Coming soon</span>
                    )}
                  </div>

                  {isLive && data ? (
                    <div className="mt-5 space-y-3">
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
                      <div className="mt-3 border-t border-stone-100 pt-3 text-xs font-medium text-coral-700">Open dashboard →</div>
                    </div>
                  ) : (
                    <div className="mt-5 border-t border-stone-100 pt-5 text-sm text-stone-500">
                      No POS data synced yet. This location will go live once its system is connected.
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-white px-6 py-6 md:px-12">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
          <div>Kantin RMS · IESPL · Signed in as {session.user.email}</div>
          <div>Data freshness depends on each location&apos;s POS sync schedule.</div>
        </div>
      </footer>
    </main>
  )
}
