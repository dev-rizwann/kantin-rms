import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { KpiStrip, LedgerTable, SectionHead, Badge, type Kpi } from "@/components/ui"
import { money, num, shortDate, timeOnly } from "@/lib/format"
import { getH8DailyCashLive, payLabel } from "@/lib/h8-live"

export const dynamic = "force-dynamic"

export default async function DailyCashPage() {
  const d = await getH8DailyCashLive()
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
      <PageHeader
        title="Daily & Cash"
        chips={["Live", `through ${shortDate(d.meta.lastSaleDate)}`, "reconciliation & accountability"]}
      />
      <KpiStrip items={kpis} />

      <section className="mb-6">
        <SectionHead title="Daily summary" context="click a date for the full day · variance is rounding-adjusted" />
        <LedgerTable
          rows={d.daily}
          cols={[
            { key: "date", header: "Date", render: (r) => <Link href={`/h8/daily/${r.saleDate}`} className="font-medium text-coral-700 hover:underline">{shortDate(r.saleDate)}</Link> },
            { key: "tickets", header: "Tickets", numeric: true, muted: true, render: (r) => num(r.tickets) },
            { key: "gross", header: "Gross", numeric: true, lead: true, render: (r) => money(r.gross) },
            { key: "pay", header: "Payments", numeric: true, render: (r) => money(r.paymentsNet) },
            { key: "round", header: "Rounding", numeric: true, muted: true, render: (r) => (r.rounding ? money(r.rounding) : "—") },
            {
              key: "var", header: "Variance", numeric: true,
              render: (r) => {
                const v = r.variance - r.rounding
                const cls = Math.abs(v) < 1 ? "text-stone-300" : Math.abs(v) < 50 ? "font-medium text-amber-600" : "font-medium text-red-600"
                return <span className={cls}>{Math.abs(v) < 1 ? "—" : money(v)}</span>
              },
            },
            { key: "voids", header: "Voids", numeric: true, render: (r) => (r.voids ? <span className="font-medium text-amber-600">{num(r.voids)}</span> : <span className="text-stone-300">—</span>) },
            { key: "cr", header: "Cancel/Refund", numeric: true, render: (r) => (r.cancels + r.refunds ? <span className="font-medium text-red-600">{r.cancels}/{r.refunds}</span> : <span className="text-stone-300">—</span>) },
          ]}
        />
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

      <section className="mb-6">
        <SectionHead title="Cashiers" context="accountability — incl. cash handled" />
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

      <section className="mb-6">
        <SectionHead title="Payment types" context="all-time" />
        <LedgerTable
          rows={d.paymentTypes}
          cols={[
            { key: "type", header: "Type", render: (r) => <span className="font-medium text-stone-900">{payLabel(r.paymentType)}</span> },
            { key: "n", header: "Count", numeric: true, muted: true, render: (r) => num(r.count) },
            { key: "tendered", header: "Tendered", numeric: true, render: (r) => money(r.tendered) },
            { key: "change", header: "Change", numeric: true, muted: true, render: (r) => (r.changeDue ? money(r.changeDue) : "—") },
            { key: "net", header: "Net", numeric: true, lead: true, render: (r) => money(r.netPaid) },
          ]}
        />
      </section>

      <section>
        <SectionHead title="Daily payment split" context="should tie out to deposits" />
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border-b border-stone-200 bg-stone-50/80 px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-stone-400">Date</th>
                {d.payTypeNames.map((t) => (
                  <th key={t} className="whitespace-nowrap border-b border-stone-200 bg-stone-50/80 px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-[0.08em] text-stone-400">{payLabel(t)}</th>
                ))}
                <th className="border-b border-stone-200 bg-stone-100/80 px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-[0.08em] text-stone-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {d.payMatrix.map((m) => (
                <tr key={m.saleDate} className="transition-colors hover:bg-coral-50/70">
                  <td className="whitespace-nowrap px-3 py-1.5 text-stone-600">{shortDate(m.saleDate)}</td>
                  {d.payTypeNames.map((t) => (
                    <td key={t} className="px-3 py-1.5 text-right tabular-nums text-stone-600">{m.byType[t] ? money(m.byType[t], { compact: true }) : <span className="text-stone-300">—</span>}</td>
                  ))}
                  <td className="bg-stone-50/60 px-3 py-1.5 text-right font-medium tabular-nums text-stone-900">{money(m.total, { compact: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
