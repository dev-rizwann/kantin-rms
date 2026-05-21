import "./globals.css"
import type { Metadata } from "next"
import { Sidebar } from "@/components/Sidebar"
import { dashboard } from "@/lib/data"

export const metadata: Metadata = {
  title: "MutfakPos Dashboard",
  description: "POS analytics & reporting",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex bg-slate-50 text-slate-900">
        <Sidebar meta={dashboard.meta} />
        <main className="flex-1 min-w-0 overflow-x-auto">
          <div className="max-w-[1400px] mx-auto px-6 py-6">{children}</div>
        </main>
      </body>
    </html>
  )
}
