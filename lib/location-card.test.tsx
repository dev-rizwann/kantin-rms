import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { LocationCard } from "../components/LocationCard"
import { kantinList, getKantin } from "./kantins"
import { can } from "./permissions"

const data = { totalGross: 12345, totalTickets: 25, daysWithSales: 2, lastSaleDate: "2026-10-21" }
const ajk = getKantin("kashmir")
const pending = renderToStaticMarkup(<LocationCard kantin={ajk} reportingLive={false} data={data} />)
assert.match(pending, /MUZAFARABAD \(AJK\)/)
assert.equal(ajk.name, "MUZAFARABAD (AJK)")
assert.doesNotMatch(pending, /AJK \(Kashmir\)/)
assert.match(pending, /href="\/kashmir"/)
assert.match(pending, /Open dashboard/)
assert.match(pending, /Portal ready/)
assert.match(pending, /first real trading date/)
assert.match(pending, /QA and test sales stay excluded/)
assert.doesNotMatch(pending, /Gross sales|>Live<|opacity-75|aria-disabled/)
for (const slug of ["h8", "chak-shahzad", "kashmir"] as const) {
  const html = renderToStaticMarkup(<LocationCard kantin={getKantin(slug)} reportingLive data={data} />)
  assert.ok(html.includes(`href="/${slug}"`))
  assert.match(html, /Gross sales/)
  assert.match(html, /Open dashboard/)
  assert.doesNotMatch(html, /Portal ready|awaits the first real trading date/)
}
const noData = renderToStaticMarkup(<LocationCard kantin={ajk} reportingLive data={null} />)
assert.match(noData, /No POS sales data synced yet/)
assert.doesNotMatch(noData, /awaits the first real trading date/)
// Publishing AJK must not broaden location-scoped account access.
assert.equal(kantinList.filter(k => can({ role: "ADMIN", kantinSlug: null }, "report.view", k.slug)).length, 3)
assert.deepEqual(kantinList.filter(k => can({ role: "VIEWER", kantinSlug: "kashmir" }, "report.view", k.slug)).map(k => k.slug), ["kashmir"])
assert.equal(can({ role: "VIEWER", kantinSlug: "h8" }, "report.view", "kashmir"), false)
console.log("Location cards: portal access, pending/live states, empty data and location scopes passed")
