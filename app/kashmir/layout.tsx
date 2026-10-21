import { Sidebar } from "@/components/Sidebar"
import { getKantin } from "@/lib/kantins"
import { requireAction } from "@/lib/server-auth"
import { getSyncStatus } from "@/lib/sync-status"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function KashmirLayout({ children }: { children: React.ReactNode }) {
  await requireAction("report.view", "kashmir")
  const [sync, boundary] = await Promise.all([
    getSyncStatus("kashmir"),
    prisma.reportingBoundary.findUnique({ where: { kantinSlug: "kashmir" } }),
  ])
  return (
    <div className="workspace-surface flex min-h-screen text-stone-900">
      <Sidebar kantin={getKantin("kashmir")} showCosting={false} sync={sync} />
      <main className="min-w-0 flex-1 overflow-x-auto">
        <div className="mx-auto max-w-[1200px] px-6 py-7">
          <div className="mb-5 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
            {boundary?.firstTradingLocal
              ? <>Reporting starts {boundary.firstTradingLocal.replace("T", " ")} PKT. Pre-launch receipts and QA/test orders are excluded.</>
              : <>Awaiting the first real trading date. Sales uploads are blocked; pre-launch QA and test sales will not enter these reports.</>}
            {!boundary?.instanceId && <span className="mt-1 block text-xs text-stone-400">POS sync agent has not connected yet.</span>}
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
