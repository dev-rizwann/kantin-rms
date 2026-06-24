import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DiagPage() {
  const start = Date.now()
  const r = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*)::int AS n FROM mp_checkout WHERE kantin_slug='h8' AND NOT void
  `
  const ms = Date.now() - start
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Diagnostic page</h1>
      <p>Tickets: {String(r[0].n)}</p>
      <p>Query time: {ms} ms</p>
      <p>Server time: {new Date().toISOString()}</p>
    </main>
  )
}
