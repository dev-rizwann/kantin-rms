import { Sidebar } from "@/components/Sidebar"
import { getKantin } from "@/lib/kantins"

export default function H8Layout({ children }: { children: React.ReactNode }) {
  const kantin = getKantin("h8")
  if (!kantin.data) return <>{children}</>
  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar kantin={kantin} meta={kantin.data.meta} />
      <main className="flex-1 min-w-0 overflow-x-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-6">{children}</div>
      </main>
    </div>
  )
}
