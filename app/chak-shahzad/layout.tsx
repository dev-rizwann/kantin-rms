import { Sidebar } from "@/components/Sidebar"
import { getKantin } from "@/lib/kantins"
import { requireAction } from "@/lib/server-auth"
import { getSyncStatus } from "@/lib/sync-status"

export const dynamic = "force-dynamic"

const SLUG = "chak-shahzad"

export default async function ChakShahzadLayout({ children }: { children: React.ReactNode }) {
  // Reporting for this kantin is gated; costing is not seeded here yet so the
  // sidebar deliberately shows Reports only.
  await requireAction("report.view", SLUG)
  const [kantin, sync] = await Promise.all([getKantin(SLUG), getSyncStatus(SLUG)])
  return (
    <div className="workspace-surface flex min-h-screen text-stone-900">
      <Sidebar kantin={kantin} showCosting={false} sync={sync} />
      <main className="min-w-0 flex-1 overflow-x-auto">
        <div className="mx-auto max-w-[1200px] px-6 py-7">{children}</div>
      </main>
    </div>
  )
}
