import assert from "node:assert/strict"
import { filterReportingSnapshot, REPORT_COLUMNS, validLocal, type Snapshot } from "./reporting-snapshot"
const from = "2026-10-22T00:00:00"
const now = "2026-10-22T09:00:00"
function fixture(): Snapshot {
  const s = Object.fromEntries(Object.keys(REPORT_COLUMNS).map(t => [t, []])) as unknown as Snapshot
  s.CATEGORY = [{ id: 1, title: "Food" }, { id: 2, title: "QA TEST 20 OCT" }]
  s.ITEM = [{ id: 1, categoryid: 1, title: "Fries" }, { id: 2, categoryid: 2, title: "Sample" }, { id: 3, categoryid: 1, title: "QA REPAIR4 TEST" }]
  s.STAFF = [{ id: 1, fname: "Kantin", sname: "Cashier", password: "must-never-sync", phone: "private" }]
  s.SESSION = [{ id: 1 }, { id: 2 }]
  s.RECEIPT = [
    { id: 5, sessionid: 1, opentime: now }, // prelaunch ID, even if reopened later
    { id: 11, sessionid: 1, opentime: "2026-10-21T23:59:59" },
    { id: 12, sessionid: 2, opentime: now }, // mixed QA ticket
    { id: 13, sessionid: 2, opentime: now }, // real
  ]
  s.ITEMSALE = [
    { id: 1, receiptid: 5, itemid: 1, saletime: now },
    { id: 2, receiptid: 12, itemid: 2, saletime: now },
    { id: 3, receiptid: 12, itemid: 1, saletime: now },
    { id: 4, receiptid: 13, itemid: 1, saletime: now },
  ]
  s.CHECKOUT = [{ id: 1, receiptid: 5, created: now }, { id: 2, receiptid: 12, created: now }, { id: 3, receiptid: 13, created: now }]
  s.PAYMENT = [{ id: 1, checkoutid: 1, paymenttime: now }, { id: 2, checkoutid: 2, paymenttime: now }, { id: 3, checkoutid: 3, paymenttime: now }]
  s.CANCEL = [{ id: 1, itemsaleid: 2, canceltime: now }, { id: 2, itemsaleid: 4, canceltime: now }]
  s.REFUND = [{ id: 1, receiptid: 12, itemsaleid: 2, refundon: now }, { id: 2, receiptid: 13, itemsaleid: 4, refundon: now }]
  return s
}
const result = filterReportingSnapshot(fixture(), 10, from)
assert.deepEqual(result.RECEIPT.map(r => r.id), [13])
assert.deepEqual(result.CHECKOUT.map(r => r.id), [3])
assert.deepEqual(result.PAYMENT.map(r => r.id), [3])
assert.deepEqual(result.ITEMSALE.map(r => r.id), [4])
assert.deepEqual(result.CANCEL.map(r => r.id), [2])
assert.deepEqual(result.REFUND.map(r => r.id), [2])
assert.deepEqual(result.ITEM.map(r => r.id), [1])
assert.deepEqual(result.CATEGORY.map(r => r.id), [1])
assert.deepEqual(result.SESSION.map(r => r.id), [2])
assert.equal("password" in result.STAFF[0], false)
assert.equal("phone" in result.STAFF[0], false)
assert.equal(validLocal("2026-02-30T00:00:00"), false)
assert.equal(validLocal("2026-10-22T00:00:00Z"), false)
assert.throws(() => filterReportingSnapshot(fixture(), 10, ""))
assert.throws(() => filterReportingSnapshot({}, 10, from))
const duplicate = fixture(); duplicate.RECEIPT.push({ ...duplicate.RECEIPT[0] })
assert.throws(() => filterReportingSnapshot(duplicate, 10, from), /Duplicate/)
const invalidDate = fixture(); invalidDate.RECEIPT[3].opentime = "2026-13-22T00:00:00"
assert.throws(() => filterReportingSnapshot(invalidDate, 10, from), /Invalid opentime/)
const prepayments = fixture(); prepayments.PAYMENT.push({ id: 4, checkoutid: null, paymenttime: null, typeid: -1 })
assert.deepEqual(filterReportingSnapshot(prepayments, 10, from).PAYMENT.map(r => r.id), [3])
const invalidType = fixture(); invalidType.CHECKOUT[2].total = "not-a-number"
assert.throws(() => filterReportingSnapshot(invalidType, 10, from), /Invalid total/)
// Refund/reopen updates survive a complete refresh; omission really removes rows.
const refreshed = fixture(); refreshed.CHECKOUT[2].void = true; refreshed.PAYMENT = []
assert.equal(filterReportingSnapshot(refreshed, 10, from).CHECKOUT[0].void, true)
assert.equal(filterReportingSnapshot(refreshed, 10, from).PAYMENT.length, 0)
console.log("Kashmir reporting boundary: exclusion, privacy and refresh checks passed")
