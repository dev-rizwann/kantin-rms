import { PageHeader } from "@/components/PageHeader"
import { KpiStrip, LedgerTable, SectionHead, Badge, type Kpi } from "@/components/ui"
import { money, num, pktDateTime, posDateTime, shortDate, timeOnly } from "@/lib/format"
import { getH8DailyCashLive } from "@/lib/h8-live"
import { getSyncStatus } from "@/lib/sync-status"
import { DailyLedger } from "@/app/h8/daily/DailyLedger"

export const dynamic = "force-dynamic"
const SLUG = "chak-shahzad"

export default async function ChakShahzadDaily() {
  const [d, sync] = await Promise.all([getH8DailyCashLive(SLUG), getSyncStatus(SLUG)])
  const k = d.kpis
  const deltaPct = k.prevGross > 0 ? ((k.todayGross - k.prevGross) / k.prevGross) * 100 : null

  const kpis: Kpi[] = [
    {
      label: "Latest day", value: money(k.todayGross, { compact: true }),
      sub: deltaPct == null ? `${num(k.todayTickets)} tickets` : `${deltaPct >= 0 ? "▲" : "▼"} ${Math.abs(deltaPct).toFixed(0)}% · ${num(k.todayTickets)} tickets`,
      tone: deltaPct == null ? "default" : deltaPct >= 0 ? "good" : "bad",
    },
    { label: "Cash collected (= deposit)", value: money(k.cashNet, { compact: true }), sub: "all-time net cash" },
    { label: "Non-cash (bank/card/FP)", value: money(k.nonCashNet, { compact: true }) },
    { label: "Open sessions", value: num(k.openSessions), tone: k.openSessions > 0 ? "warn" : "default" },
    { label: "Walk-in / named", value: `${num(k.walkInTickets)} / ${num(k.namedTickets)}`, sub: "tickets" },
  ]

  return (
    <>
      <PageHeader title="Daily &amp; Cash" chips={[`synced ${pktDateTime(sync.lastContactAt)}`, `last sale ${posDateTime(sync.lastTicketAt)}`]} />
      <KpiStrip items={kpis} />

      <section className="mb-6">
        <SectionHead title="Daily summary" context="click a date to see what sold · cash + credit + Food Panda = gross" />
        <DailyLedger rows={d.daily} slug={SLUG} />
      </section>

      <section className="mb-6">
        <SectionHead title="Cashier sessions (Z-report)" context={`${d.sessions.length} recent`} />
        <LedgerTable
          rows={d.sessions}
          cols={[
            { key: "st", header: "Status", render: (r) => <Badge tone={r.status === "open" ? "warn" : "neutral"}>{r.status === "open" ? "OPEN" : "Closed"}</Badge> },
            { key: "open", header: "Opened", render: (r) => <span>{timeOnly(r.openTime)} <span className="text-stone-400">{shortDate(r.openTime)}</span> · {r.openedBy ?? "—"}</span> },
            { key: "close", header: "Closed", render: (r) => (r.closeTime ? <span>{timeOnly(r.closeTime)} · {r.closedBy ?? "—"}</span> : <span className="font-medium text-amber-600">still open</span>) },
            { key: "tickets", header: "Tickets", numeric: true, muted: true, render: (r) => num(r.tickets) },
            { key: "gross", header: "Gross", numeric: true, lead: true, render: (r) => money(r.gross) },
          ]}
        />
      </section>

      <section>
        <SectionHead title="Cashiers" context="accountability, including cash handled" />
        <LedgerTable
          rows={d.cashiers}
          cols={[
            { key: "name", header: "Cashier", render: (r) => <span className="font-medium text-stone-900">{r.cashier}</span> },
            { key: "tickets", header: "Tickets", numeric: true, muted: true, render: (r) => num(r.tickets) },
            { key: "gross", header: "Gross", numeric: true, lead: true, render: (r) => money(r.gross) },
            { key: "avg", header: "Avg", numeric: true, render: (r) => money(r.avgTicket) },
            { key: "cash", header: "Cash handled", numeric: true, render: (r) => money(r.cashNet) },
            { key: "days", header: "Days", numeric: true, muted: true, render: (r) => num(r.daysWorked) },
          ]}
        />
      </section>
    </>
  )
}
