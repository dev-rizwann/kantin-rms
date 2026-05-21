export function money(n: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (n == null || isNaN(n as number)) return "—"
  if (opts.compact && Math.abs(n) >= 1_000_000) return "Rs " + (n / 1_000_000).toFixed(2) + "M"
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

export function shortDate(s: string | null | undefined): string {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })
}

export function shortDateTime(s: string | null | undefined): string {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function timeOnly(s: string | null | undefined): string {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })
}
