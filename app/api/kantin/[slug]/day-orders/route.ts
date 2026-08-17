import { NextRequest, NextResponse } from "next/server"
import { canCurrent } from "@/lib/server-auth"
import { getH8DayOrdersLive } from "@/lib/h8-live"
import { kantins, type KantinSlug } from "@/lib/kantins"

export const dynamic = "force-dynamic"
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Tickets + their item lines for one date at one kantin. */
export async function GET(req: NextRequest, ctx: { params: { slug: string } }) {
  const slug = ctx.params.slug
  if (!(slug in kantins)) return NextResponse.json({ error: "unknown kantin" }, { status: 404 })
  if (!(await canCurrent("report.view", slug as KantinSlug))) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const date = req.nextUrl.searchParams.get("date") ?? ""
  if (!DATE_RE.test(date)) return NextResponse.json({ error: "bad date" }, { status: 400 })
  return NextResponse.json({ date, orders: await getH8DayOrdersLive(date, slug) })
}
