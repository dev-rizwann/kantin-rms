import { NextRequest, NextResponse } from "next/server"
import { canCurrent } from "@/lib/server-auth"
import { getH8DayOrdersLive } from "@/lib/h8-live"

export const dynamic = "force-dynamic"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Tickets + their item lines for one date. Loaded on demand when a day row is
 *  expanded on /h8/daily, so the page itself stays a single query. */
export async function GET(req: NextRequest) {
  if (!(await canCurrent("report.view", "h8"))) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const date = req.nextUrl.searchParams.get("date") ?? ""
  if (!DATE_RE.test(date)) return NextResponse.json({ error: "bad date" }, { status: 400 })
  const orders = await getH8DayOrdersLive(date)
  return NextResponse.json({ date, orders })
}
