import {
  getH8Summary,
  getH8Meta,
  getH8Daily,
  getH8Sessions,
  getH8HourlyPattern,
  getH8PaymentTypes,
  getH8Categories,
  getH8TopItems30d,
} from "@/lib/h8-data"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function Diag2() {
  const t0 = Date.now()
  const summary = await getH8Summary()
  const t1 = Date.now()
  const meta = await getH8Meta()
  const t2 = Date.now()
  const daily = await getH8Daily()
  const t3 = Date.now()
  const sessions = await getH8Sessions()
  const t4 = Date.now()
  const hourly = await getH8HourlyPattern()
  const t5 = Date.now()
  const paymentTypes = await getH8PaymentTypes()
  const t6 = Date.now()
  const categories = await getH8Categories()
  const t7 = Date.now()
  const topItems = await getH8TopItems30d()
  const t8 = Date.now()

  return (
    <main className="p-8 font-mono text-sm">
      <h1 className="text-2xl font-bold mb-4">/h8/diag2 — all 8 queries, no charts</h1>
      <pre>
{`getH8Summary       ${(t1 - t0)} ms  → tickets=${summary.totalTickets} gross=${summary.totalGross}
getH8Meta          ${(t2 - t1)} ms  → first=${meta.firstSaleDate} last=${meta.lastSaleDate}
getH8Daily         ${(t3 - t2)} ms  → ${daily.length} days
getH8Sessions      ${(t4 - t3)} ms  → ${sessions.length} sessions
getH8HourlyPattern ${(t5 - t4)} ms  → ${hourly.length} hours
getH8PaymentTypes  ${(t6 - t5)} ms  → ${paymentTypes.length} types
getH8Categories    ${(t7 - t6)} ms  → ${categories.length} categories
getH8TopItems30d   ${(t8 - t7)} ms  → ${topItems.length} items

TOTAL: ${t8 - t0} ms`}
      </pre>
      <p className="mt-4 text-slate-500">Server time: {new Date().toISOString()}</p>
    </main>
  )
}
