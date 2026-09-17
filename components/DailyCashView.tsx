import { PageHeader } from "@/components/PageHeader"
import { LedgerTable, SectionHead } from "@/components/ui"
import { money, num, pktDateTime, posDateTime, shortDate } from "@/lib/format"
import { getH8DailyCashLive, payLabel } from "@/lib/h8-live"
import type { KantinSlug } from "@/lib/kantins"
import { getSyncStatus } from "@/lib/sync-status"
import { DailyLedger } from "@/app/h8/daily/DailyLedger"
import { PeriodCards } from "@/components/PeriodCards"
import { DateRangeFilter } from "@/components/DateRangeFilter"
import { RangeCards } from "@/components/RangeCards"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Daily & Cash for one kantin. Order is deliberate: rolling comparisons first,
 *  then the filter, then everything the filter drives (cards, table, splits). */
export async function DailyCashView({ slug, searchParams, headerRight }: {
  slug: KantinSlug
  searchParams?: { from?: string; to?: string }
  headerRight?: React.ReactNode
}) {
  const from = searchParams?.from && DATE_RE.test(searchParams.from) ? searchParams.from : null
  const to = searchParams?.to && DATE_RE.test(searchParams.to) ? searchParams.to : null
  const [d, sync] = await Promise.all([getH8DailyCashLive(slug, { from, to }), getSyncStatus(slug)])
  const filtered = !!(from || to)

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Daily & Cash" chips={[`synced ${pktDateTime(sync.lastContactAt)}`, `last sale ${posDateTime(sync.lastTicketAt)}`]} />
        {headerRight && <div className="pt-1">{headerRight}</div>}
      </div>

      <PeriodCards periods={d.periods} />
      <DateRangeFilter anchor={d.periods.anchor} />
      <RangeCards totals={d.range} />

      <section className="mb-6">
        <SectionHead title="Daily summary" context={`${filtered ? `${num(d.daily.length)} days in range` : "last 60 days"} · click a date to see what sold · cash + credit + Food Panda = gross`} />
        <DailyLedger rows={d.daily} slug={slug} />
      </section>

      <section className="mb-6">
        <SectionHead title="Payment types" context={filtered ? "selected range" : "all time"} />
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
              {d.payMatrix.length === 0 && (
                <tr><td colSpan={d.payTypeNames.length + 2} className="px-3 py-6 text-center text-stone-400">No payments in this range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
