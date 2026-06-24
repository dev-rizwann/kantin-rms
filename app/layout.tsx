import "./globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Kantin RMS",
  description: "Kantin Reporting & Management System — H-8, Chak Shahzad, Model Town Multan",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  )
}
