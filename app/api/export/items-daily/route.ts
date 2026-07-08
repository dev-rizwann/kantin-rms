import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import * as XLSX from "xlsx"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const K = "h8"
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Excel export: date-wise menu item breakdown.
 * GET /api/export/items-daily?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Sheets: Date x Item (long), Qty Matrix, Sales Matrix, Daily Totals.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  let from = sp.get("from") ?? ""
  let to = sp.get("to") ?? ""
  if (!DATE_RE.test(to)) to = new Date().toISOString().slice(0, 10)
  if (!DATE_RE.test(from)) from = new Date(Date.parse(to) - 29 * 86400_000).toISOString().slice(0, 10)
  if (from > to) [from, to] = [to, from]
  if (Date.parse(to) - Date.parse(from) > 366 * 86400_000) {
    return NextResponse.json({ error: "range too large (max 1 year)" }, { status: 400 })
  }

  const rows = await prisma.$queryRaw<{ payload: any }[]>`
    WITH si AS MATERIALIZED (
      SELECT s.sale_time::date AS d, s.price,
             (cn.id IS NOT NULL) AS canceled,
             it.title AS item, cat.title AS category
      FROM mp_itemsale s
      LEFT JOIN mp_cancel cn ON cn.itemsale_id = s.id AND cn.kantin_slug = ${K}
      LEFT JOIN mp_item it ON it.id = s.item_id AND it.kantin_slug = ${K}
      LEFT JOIN mp_category cat ON cat.id = it.category_id AND cat.kantin_slug = ${K}
      WHERE s.kantin_slug = ${K} AND s.sale_time::date BETWEEN ${from}::date AND ${to}::date
    ),
    co AS MATERIALIZED (
      SELECT created::date AS d, total, void
      FROM mp_checkout
      WHERE kantin_slug = ${K} AND created::date BETWEEN ${from}::date AND ${to}::date
    )
    SELECT json_build_object(
      'rows', (SELECT COALESCE(json_agg(x ORDER BY x.d, x.sales DESC), '[]'::json) FROM (
        SELECT d, item, COALESCE(category, '(uncategorized)') AS category,
               COUNT(*) AS qty, COALESCE(SUM(price), 0) AS sales
        FROM si WHERE NOT canceled GROUP BY d, item, COALESCE(category, '(uncategorized)')) x),
      'daily', (SELECT COALESCE(json_agg(y ORDER BY y.d), '[]'::json) FROM (
        SELECT d,
               COUNT(*) FILTER (WHERE NOT void) AS tickets,
               COALESCE(SUM(total) FILTER (WHERE NOT void), 0) AS gross
        FROM co GROUP BY d) y)
    ) AS payload
  `
  const p = rows[0]?.payload ?? {}
  const n = (v: any) => (v == null ? 0 : Number(v))
  type Line = { d: string; item: string; category: string; qty: number; sales: number }
  const lines: Line[] = (p.rows ?? []).map((r: any) => ({
    d: r.d, item: r.item ?? "(unknown)", category: r.category, qty: n(r.qty), sales: n(r.sales),
  }))
  const daily = (p.daily ?? []).map((y: any) => ({ d: y.d, tickets: n(y.tickets), gross: n(y.gross) }))

  const dates: string[] = Array.from(new Set(lines.map((l) => l.d))).sort()
  const wb = XLSX.utils.book_new()

  // ---- Sheet 1: Date x Item (long format — pivot-friendly) ----
  const longWs = XLSX.utils.json_to_sheet(
    lines.map((l) => ({ Date: l.d, Item: l.item, Category: l.category, Qty: l.qty, "Sales (Rs)": l.sales })),
  )
  longWs["!cols"] = [{ wch: 12 }, { wch: 28 }, { wch: 22 }, { wch: 8 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, longWs, "Date x Item")

  // ---- Sheets 2 + 3: Item x Date matrices (qty, sales) ----
  const itemCategory = new Map<string, string>()
  for (const l of lines) if (!itemCategory.has(l.item)) itemCategory.set(l.item, l.category)
  const items = Array.from(itemCategory, ([item, category]) => ({ item, category }))
  const totalsByItem = new Map<string, { qty: number; sales: number }>()
  const cell = new Map<string, { qty: number; sales: number }>()
  for (const l of lines) {
    const key = `${l.item}|${l.d}`
    cell.set(key, { qty: (cell.get(key)?.qty ?? 0) + l.qty, sales: (cell.get(key)?.sales ?? 0) + l.sales })
    const t = totalsByItem.get(l.item) ?? { qty: 0, sales: 0 }
    t.qty += l.qty; t.sales += l.sales
    totalsByItem.set(l.item, t)
  }
  items.sort((a, b) => (totalsByItem.get(b.item)?.sales ?? 0) - (totalsByItem.get(a.item)?.sales ?? 0))

  function matrix(kind: "qty" | "sales") {
    const header = ["Item", "Category", ...dates, "TOTAL"]
    const body = items.map(({ item, category }) => {
      const vals = dates.map((d) => cell.get(`${item}|${d}`)?.[kind] ?? 0)
      return [item, category, ...vals, vals.reduce((s, v) => s + v, 0)]
    })
    const totalRow = ["TOTAL", "", ...dates.map((d) =>
      items.reduce((s, { item }) => s + (cell.get(`${item}|${d}`)?.[kind] ?? 0), 0),
    ), lines.reduce((s, l) => s + l[kind], 0)]
    const ws = XLSX.utils.aoa_to_sheet([header, ...body, totalRow])
    ws["!cols"] = [{ wch: 28 }, { wch: 20 }, ...dates.map(() => ({ wch: 11 })), { wch: 12 }]
    return ws
  }
  XLSX.utils.book_append_sheet(wb, matrix("qty"), "Qty by Date")
  XLSX.utils.book_append_sheet(wb, matrix("sales"), "Sales by Date")

  // ---- Sheet 4: Daily totals ----
  const dailyWs = XLSX.utils.json_to_sheet(
    daily.map((y: any) => ({ Date: y.d, Tickets: y.tickets, "Gross (Rs)": y.gross })),
  )
  dailyWs["!cols"] = [{ wch: 12 }, { wch: 9 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, dailyWs, "Daily Totals")

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  const filename = `kantin-h8-items_${from}_to_${to}.xlsx`
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
