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
      <PageHeader title="Daily & Cash" subtitle={`Live · through ${shortDate(d.meta.lastSaleDate)} · reconciliation & accountability`} />
      <KpiStrip items={kpis} />

      <section className="mb-6">
        <SectionHead title="Daily summary" context="gross vs payments — variance is rounding-adjusted" />
        <LedgerTable
          rows={d.daily}
          cols={[
            { key: "date", header: "Date", render: (r) => shortDate(r.saleDate) },
            { key: "tickets", header: "Tickets", numeric: true, muted: true, render: (r) => num(r.tickets) },
            { key: "gross", header: "Gross", numeric: true, lead: true, render: (r) => money(r.gross) },
            { key: "pay", header: "Payments", numeric: true, render: (r) => money(r.paymentsNet) },
            { key: "round", header: "Rounding", numeric: true, muted: true, render: (r) => (r.rounding ? money(r.rounding) : "—") },
            {
              key: "var", header: "Variance", numeric: true,
              render: (r) => {
                const v = r.variance - r.rounding
                const cls = Math.abs(v) < 1 ? "text-slate-400" : Math.abs(v) < 50 ? "text-amber-600" : "text-red-600"
                return <span className={cls}>{Math.abs(v) < 1 ? "—" : money(v)}</span>
              },
            },
            { key: "voids", header: "Voids", numeric: true, render: (r) => (r.voids ? <span className="text-amber-600">{num(r.voids)}</span> : <span className="text-slate-300">—</span>) },
            { key: "cr", header: "Cancel/Refund", numeric: true, render: (r) => (r.cancels + r.refunds ? <span className="text-red-600">{r.cancels}/{r.refunds}</span> : <span className="text-slate-300">—</span>) },
          ]}
        />
      </section>

      <section className="mb-6">
        <SectionHead title="Cashier sessions (Z-report)" context={`${d.sessions.length} recent`} />
        <LedgerTable
          rows={d.sessions}
          cols={[
            { key: "st", header: "Status", render: (r) => <Badge tone={r.status === "open" ? "warn" : "neutral"}>{r.status === "open" ? "OPEN" : "Closed"}</Badge> },
            { key: "open", header: "Opened", render: (r) => <span>{timeOnly(r.openTime)} <span className="text-slate-400">{shortDate(r.openTime)}</span> · {r.openedBy ?? "—"}</span> },
            { key: "close", header: "Closed", render: (r) => (r.closeTime ? <span>{timeOnly(r.closeTime)} · {r.closedBy ?? "—"}</span> : <span className="text-amber-600">still open</span>) },
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
            { key: "name", header: "Cashier", render: (r) => <span className="font-medium text-slate-900">{r.cashier}</span> },
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
            { key: "type", header: "Type", render: (r) => <span className="font-medium text-slate-900">{payLabel(r.paymentType)}</span> },
            { key: "n", header: "Count", numeric: true, muted: true, render: (r) => num(r.count) },
            { key: "tendered", header: "Tendered", numeric: true, render: (r) => money(r.tendered) },
            { key: "change", header: "Change", numeric: true, muted: true, render: (r) => (r.changeDue ? money(r.changeDue) : "—") },
            { key: "net", header: "Net", numeric: true, lead: true, render: (r) => money(r.netPaid) },
          ]}
        />
      </section>

      <section>
        <SectionHead title="Daily payment split" context="should tie out to deposits" />
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-[13px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">Date</th>
                {d.payTypeNames.map((t) => (
                  <th key={t} className="border-b border-slate-200 px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-slate-500 whitespace-nowrap">{payLabel(t)}</th>
                ))}
                <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-slate-600">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.payMatrix.map((m) => (
                <tr key={m.saleDate} className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 whitespace-nowrap">{shortDate(m.saleDate)}</td>
                  {d.payTypeNames.map((t) => (
                    <td key={t} className="px-3 py-1.5 text-right tabular-nums text-slate-700">{m.byType[t] ? money(m.byType[t], { compact: true }) : <span className="text-slate-300">—</span>}</td>
                  ))}
                  <td className="bg-slate-50 px-3 py-1.5 text-right font-medium tabular-nums text-slate-900">{money(m.total, { compact: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
