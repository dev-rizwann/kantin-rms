"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createVendor } from "../../actions"

const CADENCE = [
  { v: "", l: "—" },
  { v: "DAILY_FRESH", l: "Daily fresh (veg, bread, milk)" },
  { v: "WEEKLY", l: "Weekly (meat, chicken)" },
  { v: "MONTHLY", l: "Monthly (dry goods, packaging)" },
  { v: "AGGREGATOR", l: "Aggregator (Foodpanda etc.)" },
  { v: "CASH_MARKET", l: "Cash market (mandi)" },
]

export function VendorForm() {
  const router = useRouter()
  const [f, setF] = useState({
    name: "", contactPerson: "", phone: "", whatsapp: "", address: "",
    ntn: "", strn: "", isSalesTaxRegistered: false,
    paymentTermsDays: "", supplyCadence: "",
    bankName: "", bankAccountNumber: "", jazzcashNumber: "", easypaisaNumber: "",
    nameUr: "", notes: "",
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setBusy(true)
    const res = await createVendor({
      ...f,
      paymentTermsDays: f.paymentTermsDays ? parseInt(f.paymentTermsDays) : null,
      supplyCadence: f.supplyCadence || null,
    })
    setBusy(false)
    if (!res.ok) { setError(res.error ?? "Failed"); return }
    router.push("/h8/vendors"); router.refresh()
  }

  const input = "w-full px-3 py-2.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  const label = "block text-sm font-medium text-stone-700 mb-1"

  return (
    <form onSubmit={submit} className="max-w-2xl bg-white border border-stone-200 rounded-lg shadow-sm p-6 space-y-4">
      <div><label className={label}>Vendor name *</label><input className={input} value={f.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. CHADURAY / Hamza Vegetables" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={label}>Contact person</label><input className={input} value={f.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} /></div>
        <div><label className={label}>WhatsApp / phone</label><input className={input} value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="03xx-xxxxxxx" /></div>
      </div>
      <div><label className={label}>Address</label><input className={input} value={f.address} onChange={(e) => set("address", e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Supply cadence</label>
          <select className={input} value={f.supplyCadence} onChange={(e) => set("supplyCadence", e.target.value)}>
            {CADENCE.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
          </select>
        </div>
        <div><label className={label}>Payment terms (days)</label><input className={input} type="number" min="0" value={f.paymentTermsDays} onChange={(e) => set("paymentTermsDays", e.target.value)} placeholder="0 = cash" /></div>
      </div>

      <div className="border-t border-stone-100 pt-4">
        <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
          <input type="checkbox" checked={f.isSalesTaxRegistered} onChange={(e) => set("isSalesTaxRegistered", e.target.checked)} />
          Sales-tax registered (has STRN — appears on input-tax report)
        </label>
        {f.isSalesTaxRegistered && (
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div><label className={label}>NTN</label><input className={input} value={f.ntn} onChange={(e) => set("ntn", e.target.value)} /></div>
            <div><label className={label}>STRN</label><input className={input} value={f.strn} onChange={(e) => set("strn", e.target.value)} /></div>
          </div>
        )}
      </div>

      <details className="border-t border-stone-100 pt-4">
        <summary className="text-sm font-medium text-stone-700 cursor-pointer">Payment rails (optional)</summary>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div><label className={label}>Bank name</label><input className={input} value={f.bankName} onChange={(e) => set("bankName", e.target.value)} /></div>
          <div><label className={label}>Account number / IBAN</label><input className={input} value={f.bankAccountNumber} onChange={(e) => set("bankAccountNumber", e.target.value)} /></div>
          <div><label className={label}>JazzCash number</label><input className={input} value={f.jazzcashNumber} onChange={(e) => set("jazzcashNumber", e.target.value)} /></div>
          <div><label className={label}>EasyPaisa number</label><input className={input} value={f.easypaisaNumber} onChange={(e) => set("easypaisaNumber", e.target.value)} /></div>
        </div>
      </details>

      {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">{error}</div>}
      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 disabled:bg-emerald-400">{busy ? "Saving…" : "Save vendor"}</button>
        <button type="button" onClick={() => router.back()} className="px-4 py-2.5 border border-stone-300 rounded-md hover:bg-stone-50">Cancel</button>
      </div>
    </form>
  )
}
