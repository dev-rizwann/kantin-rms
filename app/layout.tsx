import "./globals.css"
import type { Metadata } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import { Providers } from "./providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Kantin RMS",
  description: "Kantin Reporting & Management System — H-8, Chak Shahzad, Model Town Multan",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`}>
      <body className="min-h-screen bg-[#f6f5f1] font-sans text-stone-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
