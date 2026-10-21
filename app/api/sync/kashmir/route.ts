import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { filterReportingSnapshot, REPORT_COLUMNS, type ReportTable } from "@/lib/reporting-snapshot"

export const dynamic = "force-dynamic"
const SLUG = "kashmir"
const MAX_BYTES = 32 * 1024 * 1024
const identity = z.string().uuid()
const Registration = z.object({ mode: z.literal("register"), instanceId: identity, receiptBaseline: z.number().int().min(0).max(2147483647) })
const Upload = z.object({ mode: z.literal("snapshot"), instanceId: identity, backupAt: z.string().datetime(), firstTradingLocal: z.string(), tables: z.unknown() })
async function authenticated(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) return false
  const stored = await prisma.syncToken.findUnique({ where: { kantinSlug: SLUG } })
  return !!stored?.isActive && await bcrypt.compare(auth.slice(7).trim(), stored.tokenHash)
}
async function contact() {
  await prisma.syncToken.update({ where: { kantinSlug: SLUG }, data: { lastUsedAt: new Date() } })
}
export async function GET(req: NextRequest) {
  if (!await authenticated(req)) return NextResponse.json({ ok: false }, { status: 401 })
  const boundary = await prisma.reportingBoundary.findUnique({ where: { kantinSlug: SLUG } })
  if (!boundary) return NextResponse.json({ ok: false, error: "Boundary missing" }, { status: 503 })
  await contact()
  return NextResponse.json({ ok: true, protocol: 2, ...boundary }, { headers: { "Cache-Control": "no-store" } })
}
export async function POST(req: NextRequest) {
  if (!await authenticated(req)) return NextResponse.json({ ok: false }, { status: 401 })
  if (Number(req.headers.get("content-length")) > MAX_BYTES) return NextResponse.json({ ok: false, error: "Snapshot too large" }, { status: 413 })
  // Bound the body while streaming, not just after allocating an arbitrary payload.
  const reader = req.body?.getReader()
  if (!reader) return NextResponse.json({ ok: false }, { status: 400 })
  const chunks: Uint8Array[] = []; let bytes = 0
  while (true) {
    const chunk = await reader.read(); if (chunk.done) break
    bytes += chunk.value.length
    if (bytes > MAX_BYTES) { await reader.cancel(); return NextResponse.json({ ok: false, error: "Snapshot too large" }, { status: 413 }) }
    chunks.push(chunk.value)
  }
  let body: unknown
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")) } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }) }
  const registration = Registration.safeParse(body)
  if (registration.success) {
    const r = registration.data
    // Atomic compare-and-set: a retry cannot move the pre-launch boundary.
    await prisma.reportingBoundary.updateMany({ where: { kantinSlug: SLUG, instanceId: null, firstTradingLocal: null }, data: { instanceId: r.instanceId, receiptBaseline: r.receiptBaseline, registeredAt: new Date() } })
    const saved = await prisma.reportingBoundary.findUnique({ where: { kantinSlug: SLUG } })
    if (saved?.instanceId !== r.instanceId || saved.receiptBaseline !== r.receiptBaseline) return NextResponse.json({ ok: false, error: "Registration boundary mismatch; operator review required" }, { status: 409 })
    await contact()
    return NextResponse.json({ ok: true, status: "registered", firstTradingLocal: saved.firstTradingLocal })
  }
  const parsed = Upload.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid snapshot contract" }, { status: 400 })
  const upload = parsed.data
  const boundary = await prisma.reportingBoundary.findUnique({ where: { kantinSlug: SLUG } })
  if (!boundary?.firstTradingLocal || boundary.receiptBaseline == null) return NextResponse.json({ ok: false, error: "Awaiting confirmed first trading date" }, { status: 409 })
  if (boundary.instanceId !== upload.instanceId || boundary.firstTradingLocal !== upload.firstTradingLocal) return NextResponse.json({ ok: false, error: "Installation or trading boundary mismatch" }, { status: 409 })
  const backupAt = new Date(upload.backupAt)
  if (backupAt.getTime() > Date.now() + 300_000) return NextResponse.json({ ok: false, error: "Backup timestamp is in the future" }, { status: 400 })
  let tables
  try { tables = filterReportingSnapshot(upload.tables, boundary.receiptBaseline, boundary.firstTradingLocal) } catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 }) }
  try {
    await prisma.$transaction(async tx => {
      // Serialize snapshots and prevent an older backup from rolling reports back.
      await tx.$queryRaw`SELECT "kantinSlug" FROM reporting_boundary WHERE "kantinSlug"=${SLUG} FOR UPDATE`
      const current = await tx.reportingBoundary.findUniqueOrThrow({ where: { kantinSlug: SLUG } })
      if (current.firstTradingLocal !== upload.firstTradingLocal || current.instanceId !== upload.instanceId || current.receiptBaseline !== boundary.receiptBaseline || (current.lastBackupAt && backupAt < current.lastBackupAt)) throw new Error("Snapshot superseded; retry with latest policy/backup")
      for (const table of Object.keys(REPORT_COLUMNS) as ReportTable[]) {
        const rows = tables[table] as Prisma.InputJsonValue[]
        const payloadBytes = Buffer.byteLength(JSON.stringify(rows))
        const highestId = tables[table].reduce((m, r) => Math.max(m, r.id as number), 0)
        const data = { kantinSlug: SLUG, table, rows, rowCount: rows.length, highestId, bytes: payloadBytes, receivedAt: new Date() }
        // One complete current snapshot per table. Updates, refunds, reopens and
        // deletions propagate; repeated uploads never duplicate historical rows.
        await tx.syncBatch.upsert({ where: { id: `kantin-v2:${SLUG}:${table}` }, create: { id: `kantin-v2:${SLUG}:${table}`, ...data }, update: data })
        await tx.syncState.upsert({ where: { kantinSlug_tableName: { kantinSlug: SLUG, tableName: table } }, create: { kantinSlug: SLUG, tableName: table, lastSeenId: highestId, lastSyncAt: new Date(), totalBatches: 1, totalRows: rows.length }, update: { lastSeenId: highestId, lastSyncAt: new Date(), totalBatches: { increment: 1 }, totalRows: { increment: rows.length } } })
      }
      await tx.reportingBoundary.update({ where: { kantinSlug: SLUG }, data: { lastBackupAt: backupAt } })
      await tx.syncToken.update({ where: { kantinSlug: SLUG }, data: { lastUsedAt: new Date() } })
    }, { timeout: 60_000 })
  } catch (e) {
    if ((e as Error).message.startsWith("Snapshot superseded")) return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 409 })
    console.error("Kashmir snapshot transaction failed", (e as Error).name)
    return NextResponse.json({ ok: false, error: "Snapshot was not committed; retry later" }, { status: 503 })
  }
  return NextResponse.json({ ok: true, tables: Object.keys(tables).length, rows: Object.values(tables).reduce((n, rows) => n + rows.length, 0), backupAt: upload.backupAt })
}
