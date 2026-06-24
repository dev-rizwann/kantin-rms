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

async function tap<T>(name: string, fn: () => Promise<T>): Promise<T> {
  // eslint-disable-next-line no-console
  console.log(`[diag3] starting ${name}`)
  const t = Date.now()
  try {
    const r = await fn()
    console.log(`[diag3] ${name} OK ${Date.now() - t}ms`)
    return r
  } catch (e) {
    console.error(`[diag3] ${name} ERR ${Date.now() - t}ms`, e)
    throw e
  }
}

export default async function Diag3() {
  console.log("[diag3] === entering page ===")
  const summary = await tap("summary", getH8Summary)
  const meta = await tap("meta", getH8Meta)
  const daily = await tap("daily", getH8Daily)
  const sessions = await tap("sessions", getH8Sessions)
  const hourly = await tap("hourly", getH8HourlyPattern)
  const paymentTypes = await tap("paymentTypes", getH8PaymentTypes)
  const categories = await tap("categories", getH8Categories)
  const topItems = await tap("topItems", getH8TopItems30d)
  console.log("[diag3] === all queries done ===")
  return (
    <main className="p-8 font-mono text-sm">
      <p>tickets={summary.totalTickets}</p>
      <p>last sale={meta.lastSaleDate}</p>
      <p>daily rows={daily.length}</p>
      <p>sessions={sessions.length}</p>
      <p>hourly={hourly.length}</p>
      <p>paymentTypes={paymentTypes.length}</p>
      <p>categories={categories.length}</p>
      <p>topItems={topItems.length}</p>
    </main>
  )
}
