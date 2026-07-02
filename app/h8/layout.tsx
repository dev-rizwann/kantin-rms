import { Sidebar } from "@/components/Sidebar"
import { getKantin } from "@/lib/kantins"

export default function H8Layout({ children }: { children: React.ReactNode }) {
  const kantin = getKantin("h8")
  return (
    <div className="flex min-h-screen bg-[#f6f5f1] text-stone-900">
      <Sidebar kantin={kantin} />
      <main className="min-w-0 flex-1 overflow-x-auto">
        <div className="mx-auto max-w-[1200px] px-6 py-7">{children}</div>
      </main>
    </div>
  )
}
