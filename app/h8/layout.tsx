import { Sidebar } from "@/components/Sidebar"
import { getKantin } from "@/lib/kantins"

export default function H8Layout({ children }: { children: React.ReactNode }) {
  const kantin = getKantin("h8")
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar kantin={kantin} />
      <main className="min-w-0 flex-1 overflow-x-auto">
        <div className="mx-auto max-w-[1200px] px-5 py-6">{children}</div>
      </main>
    </div>
  )
}
