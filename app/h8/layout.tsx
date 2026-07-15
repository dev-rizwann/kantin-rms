import { Sidebar } from "@/components/Sidebar"
import { getKantin } from "@/lib/kantins"
import { canCurrent } from "@/lib/server-auth"

export default async function H8Layout({ children }: { children: React.ReactNode }) {
  const kantin = getKantin("h8")
  const showCosting = await canCurrent("report.view_cost", "h8")
  return (
    <div className="workspace-surface flex min-h-screen text-stone-900">
      <Sidebar kantin={kantin} showCosting={showCosting} />
      <main className="min-w-0 flex-1 overflow-x-auto">
        <div className="mx-auto max-w-[1200px] px-6 py-7">{children}</div>
      </main>
    </div>
  )
}
