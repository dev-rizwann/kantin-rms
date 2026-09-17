import { PageHeader } from "@/components/PageHeader"
import { Badge, LedgerTable, SectionHead } from "@/components/ui"
import { money, num, pktDateTime, posDateTime, shortDate, timeOnly } from "@/lib/format"
import { getH8CashiersLive } from "@/lib/h8-live"
import type { KantinSlug } from "@/lib/kantins"
import { getSyncStatus } from "@/lib/sync-status"

/** Cashier sessions (the POS Z-report) plus per-cashier accountability. */
export async function CashiersView({ slug }: { slug: KantinSlug }) {
  const [d, sync] = await Promise.all([getH8CashiersLive(slug), getSyncStatus(slug)])
  const chips = [`synced ${pktDateTime(sync.lastContactAt)}`, `last sale ${posDateTime(sync.lastTicketAt)}`]
  if (d.openSessions > 0) chips.push(`${num(d.openSessions)} session${d.openSessions === 1 ? "" : "s"} still open`)

  return (
    <>
      <PageHeader title="Cashiers & Z-report" chips={chips} />

      <section className="mb-6">
        <SectionHead title="Cashiers" context="all time · incl. cash handled" />
        <LedgerTable
          rows={d.cashiers}
          cols={[
            { key: "name", header: "Cashier", render: (r) => <span className="font-medium text-stone-900">{r.cashier}</span> },
            { key: "tickets", header: "Tickets", numeric: true, muted: true, render: (r) => num(r.tickets) },
            { key: "gross", header: "Gross", numeric: true, lead: true, render: (r) => money(r.gross) },
            { key: "avg", header: "Avg", numeric: true, render: (r) => money(r.avgTicket) },
            { key: "cash", header: "Cash handled", numeric: true, render: (r) => money(r.cashNet) },
            { key: "days", header: "Days", numeric: true, muted: true, render: (r) => num(r.daysWorked) },
            { key: "last", header: "Last ticket", muted: true, render: (r) => (r.lastTicket ? `${shortDate(r.lastTicket)} ${timeOnly(r.lastTicket)}` : "—") },
          ]}
        />
      </section>

      <section>
        <SectionHead title="Cashier sessions (Z-report)" context={`${d.sessions.length} most recent · a session left open never gets a closing count`} />
        <LedgerTable
          rows={d.sessions}
          cols={[
            { key: "st", header: "Status", render: (r) => <Badge tone={r.status === "open" ? "warn" : "neutral"}>{r.status === "open" ? "OPEN" : "Closed"}</Badge> },
            { key: "open", header: "Opened", render: (r) => <span>{timeOnly(r.openTime)} <span className="text-stone-400">{shortDate(r.openTime)}</span> · {r.openedBy ?? "—"}</span> },
            { key: "close", header: "Closed", render: (r) => (r.closeTime ? <span>{timeOnly(r.closeTime)} <span className="text-stone-400">{shortDate(r.closeTime)}</span> · {r.closedBy ?? "—"}</span> : <span className="font-medium text-amber-600">still open</span>) },
            { key: "tickets", header: "Tickets", numeric: true, muted: true, render: (r) => num(r.tickets) },
            { key: "gross", header: "Gross", numeric: true, lead: true, render: (r) => money(r.gross) },
            { key: "petty", header: "Petty cash", numeric: true, muted: true, render: (r) => (r.pettyCash ? money(r.pettyCash) : "—") },
          ]}
        />
      </section>
    </>
  )
}
