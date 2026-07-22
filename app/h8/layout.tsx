import { Sidebar } from "@/components/Sidebar"
import { getKantin } from "@/lib/kantins"
import { canCurrent } from "@/lib/server-auth"
import { getSyncStatus } from "@/lib/sync-status"

export const dynamic = "force-dynamic"

export default async function H8Layout({ children }: { children: React.ReactNode }) {
  const kantin = getKantin("h8")
  const [showCosting, sync] = await Promise.all([canCurrent("report.view_cost", "h8"), getSyncStatus("h8")])
  return (
    <div className="workspace-surface flex min-h-screen text-stone-900">
      <Sidebar kantin={kantin} showCosting={showCosting} sync={sync} />
      <main className="min-w-0 flex-1 overflow-x-auto">
        <div className="mx-auto max-w-[1200px] px-6 py-7">{children}</div>
      </main>
    </div>
  )
}
