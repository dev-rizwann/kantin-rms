import { kantinList } from "@/lib/kantins"
import { LocationCard } from "@/components/LocationCard"
import { requireSession } from "@/lib/session"
import { UserMenu } from "@/components/UserMenu"
import { getH8LandingSummary } from "@/lib/h8-live"
import { can } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function LandingPage() {
  const session = await requireSession()
  const locations = kantinList.filter((k) => can(session.user, "report.view", k.slug))
  const [summaries, boundary] = await Promise.all([
    Promise.all(locations.map((k) => getH8LandingSummary(k.slug))),
    prisma.reportingBoundary.findUnique({ where: { kantinSlug: "kashmir" } }),
  ])

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
              {locations.length} locations
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {locations.map((k, index) => {
              const isLive = k.slug === "kashmir" ? !!boundary?.firstTradingLocal : k.status === "live"
              return (
                <LocationCard
                  key={k.slug}
                  kantin={k}
                  reportingLive={isLive}
                  data={summaries[index]}
                />
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
