export function money(n: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (n == null || isNaN(n as number)) return "—"
  // Switch unit on the ROUNDED value, so 999,950 reads "Rs 1.00M", not "Rs 1000.0K".
  if (opts.compact && Math.abs(n) >= 999_950) return "Rs " + (n / 1_000_000).toFixed(2) + "M"
  if (opts.compact && Math.abs(n) >= 1_000) return "Rs " + (n / 1_000).toFixed(1) + "K"
  return "Rs " + n.toLocaleString("en-PK", { maximumFractionDigits: 2 })
}

export function num(n: number | null | undefined): string {
  if (n == null || isNaN(n as number)) return "—"
  return n.toLocaleString("en-PK")
}

export function pct(n: number | null | undefined): string {
  if (n == null) return "—"
  return (n * 100).toFixed(1) + "%"
}

/** A date-only string ("2026-01-05") or a naive POS timestamp, printed as its
 *  own calendar day. Pinned to UTC: these values carry no zone, and Postgres
 *  hands them back as if they were UTC, so UTC is the only zone that prints
 *  them unshifted. Without the pin a browser in Pakistan moved any sale after
 *  7 PM onto the next day. For real instants use pktDate(). */
export function shortDate(s: string | null | undefined): string {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString("en-PK", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })
}

/** A real instant (login time, GRN received-at) shown as a Pakistan calendar day. */
export function pktDate(s: string | Date | null | undefined): string {
  if (!s) return "—"
  const d = s instanceof Date ? s : new Date(s)
  if (isNaN(d.getTime())) return String(s)
  return d.toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric" })
}

/** A real instant shown in Pakistan time. Never pass a POS timestamp here. */
export function shortDateTime(s: string | null | undefined): string {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Pakistan Standard Time, pinned. Use for real timestamptz values (sync
 *  timestamps, audit rows) — the server container runs UTC and viewers can be
 *  anywhere, so neither default is right. POS timestamps are naive local time
 *  and must NOT go through this. */
export function pktDateTime(s: string | Date | null | undefined): string {
  if (!s) return "—"
  const d = s instanceof Date ? s : new Date(s)
  if (isNaN(d.getTime())) return String(s)
  return d.toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
  })
}

/** "4 min ago" / "2 h ago" / "3 d ago" */
export function agoLabel(s: string | Date | null | undefined, now: number = Date.now()): string {
  if (!s) return "never"
  const t = (s instanceof Date ? s : new Date(s)).getTime()
  if (isNaN(t)) return "—"
  const mins = Math.max(0, Math.round((now - t) / 60000))
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} h ago`
  return `${Math.round(hrs / 24)} d ago`
}

/** A POS timestamp, which is a NAIVE local wall-clock (no zone) that Postgres
 *  hands back as if it were UTC. Formatting in UTC prints the original clock
 *  reading unshifted — do NOT use pktDateTime() on these or they move 5 hours. */
export function posDateTime(s: string | Date | null | undefined): string {
  if (!s) return "—"
  const d = s instanceof Date ? s : new Date(s)
  if (isNaN(d.getTime())) return String(s)
  return d.toLocaleString("en-PK", {
    timeZone: "UTC",
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
  })
}

/** Hour-of-day (0–23) as a clock label: 0 -> "12 AM", 8 -> "8 AM", 13 -> "1 PM". */
export function hourLabel(h: number | null | undefined): string {
  if (h == null || isNaN(h)) return "—"
  const hr = ((h % 24) + 24) % 24
  const suffix = hr < 12 ? "AM" : "PM"
  const twelve = hr % 12 === 0 ? 12 : hr % 12
  return `${twelve} ${suffix}`
}

/** Clock time of a naive POS timestamp. Pinned to UTC for the same reason as
 *  shortDate(): unpinned, the day-orders list (a client component) showed every
 *  order 5 hours late in a Pakistan browser. */
export function timeOnly(s: string | null | undefined): string {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleTimeString("en-PK", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" })
}
