import "./globals.css"
import type { Metadata } from "next"
import { Providers } from "./providers"

export const metadata: Metadata = {
  title: "Kantin RMS",
  description: "Kantin Reporting & Management System — H-8, Chak Shahzad, Model Town Multan",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
