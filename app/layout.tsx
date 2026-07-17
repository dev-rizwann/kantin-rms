import "./globals.css"
import type { Metadata } from "next"
import { Manrope, Space_Grotesk } from "next/font/google"
import { Providers } from "./providers"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
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
  icons: {
    icon: [{ url: "/brand/kantin-k.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/brand/kantin-k.png",
    apple: [{ url: "/brand/kantin-k.png", sizes: "512x512", type: "image/png" }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${space.variable}`}>
      <body className="min-h-screen bg-[#f6f5f1] font-sans text-stone-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
