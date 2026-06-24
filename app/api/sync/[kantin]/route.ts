import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const BatchSchema = z.object({
  table: z.string().min(1).max(64),
  rows: z.array(z.record(z.unknown())),
  highestId: z.number().int().nullable().optional(),
})

const PayloadSchema = z.object({
  batches: z.array(BatchSchema).min(1).max(100),
  sentAt: z.string().optional(),
})

/**
 * POST /api/sync/{kantin}
 *
 * Header: Authorization: Bearer <token>
 * Body:
 *   {
 *     batches: [
 *       { table: "CHECKOUT", rows: [...], highestId: 30437 },
 *       { table: "ITEMSALE", rows: [...], highestId: 43791 },
 *       ...
 *     ]
 *   }
 *
 * Response:
 *   {
 *     ok: true,
 *     received: { tables: 5, rows: 42, bytes: 12345 },
 *     watermarks: { CHECKOUT: 30437, ITEMSALE: 43791, ... }
 *   }
 */
export async function POST(req: NextRequest, ctx: { params: { kantin: string } }) {
  const start = Date.now()
  const kantinSlug = ctx.params.kantin

  // 1. Auth
  const auth = req.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Missing bearer token" }, { status: 401 })
  }
  const token = auth.slice(7).trim()

  const stored = await prisma.syncToken.findUnique({ where: { kantinSlug } })
  if (!stored || !stored.isActive) {
    return NextResponse.json({ ok: false, error: "No active token for this kantin" }, { status: 401 })
  }
  const tokenOk = await bcrypt.compare(token, stored.tokenHash)
  if (!tokenOk) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 })
  }

  // 2. Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = PayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // 3. Store each batch + update watermark
  const watermarks: Record<string, number | null> = {}
  let totalRows = 0
  let totalBytes = 0

  for (const b of parsed.data.batches) {
    const payloadBytes = Buffer.byteLength(JSON.stringify(b.rows), "utf8")
    totalRows += b.rows.length
    totalBytes += payloadBytes

    await prisma.$transaction(async (tx) => {
      // Insert the batch (skip empty batches — we still record the watermark)
      if (b.rows.length > 0) {
        await tx.syncBatch.create({
          data: {
            kantinSlug,
            table: b.table,
            rowCount: b.rows.length,
            rows: b.rows as any,
            highestId: b.highestId ?? null,
            bytes: payloadBytes,
          },
        })
      }
      // Update or create the sync state
      const newHigh = b.highestId ?? null
      await tx.syncState.upsert({
        where: { kantinSlug_tableName: { kantinSlug, tableName: b.table } },
        update: {
          lastSeenId: newHigh,
          lastSyncAt: new Date(),
          totalBatches: { increment: b.rows.length > 0 ? 1 : 0 },
          totalRows: { increment: b.rows.length },
        },
        create: {
          kantinSlug,
          tableName: b.table,
          lastSeenId: newHigh,
          lastSyncAt: new Date(),
          totalBatches: b.rows.length > 0 ? 1 : 0,
          totalRows: b.rows.length,
        },
      })
    })

    watermarks[b.table] = b.highestId ?? null
  }

  // 4. Touch the token's last-used field
  const ipHeader = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? ""
  await prisma.syncToken.update({
    where: { kantinSlug },
    data: { lastUsedAt: new Date(), lastIp: ipHeader.split(",")[0].trim() || null },
  })

  const durationMs = Date.now() - start
  return NextResponse.json({
    ok: true,
    received: {
      tables: parsed.data.batches.length,
      rows: totalRows,
      bytes: totalBytes,
      durationMs,
    },
    watermarks,
  })
}

/**
 * GET /api/sync/{kantin}
 * Health check — returns last sync state per table for this kantin.
 * Same bearer auth as POST.
 */
export async function GET(req: NextRequest, ctx: { params: { kantin: string } }) {
  const kantinSlug = ctx.params.kantin
  const auth = req.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Missing bearer token" }, { status: 401 })
  }
  const token = auth.slice(7).trim()
  const stored = await prisma.syncToken.findUnique({ where: { kantinSlug } })
  if (!stored || !stored.isActive) return NextResponse.json({ ok: false }, { status: 401 })
  if (!(await bcrypt.compare(token, stored.tokenHash))) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const states = await prisma.syncState.findMany({
    where: { kantinSlug },
    orderBy: { tableName: "asc" },
  })
  return NextResponse.json({
    ok: true,
    kantinSlug,
    states: states.map((s) => ({
      table: s.tableName,
      lastSeenId: s.lastSeenId,
      lastSyncAt: s.lastSyncAt,
      totalBatches: s.totalBatches,
      totalRows: s.totalRows,
    })),
  })
}
