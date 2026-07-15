"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { saveRecipe } from "./actions"

type ProductOption = { id: string; name: string; kind: string; category: string; uomCode: string; unitCost: number | null }
type PosOption = { id: string; title: string; category: string | null; price: number }
type Existing = {
  id: string; name: string; kind: "SEMI_FINISHED" | "MENU"; outputProductId: string | null; outputQty: number; outputUomCode: string
  referenceSellPrice: number | null; targetFoodCostPct: number; notes: string | null
  lines: { kind: "PRODUCT" | "COST_ADJUSTMENT"; productId: string | null; label: string | null; quantity: number; uomCode: string | null; fixedUnitCost: number | null }[]
  aliases: { title: string; posItemId: string; isPrimary: boolean }[]
  cost: { totalCost: number; costPerOutputUnit: number | null; flags: { message: string }[] }
}
interface Props { kind: "SEMI_FINISHED" | "MENU"; products: ProductOption[]; uoms: { code: string; name: string; dimension: string }[]; posItems: PosOption[]; existing?: Existing | null }
type DraftLine = { key: string; kind: "PRODUCT" | "COST_ADJUSTMENT"; category: string; productId: string; quantity: number; uomCode: string; label: string; fixedUnitCost: number }

export function RecipeForm({ kind, products, uoms, posItems, existing }: Props) {
  const router = useRouter()
  const categories = useMemo(() => [...new Set(products.map((p) => p.category))].sort(), [products])
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const [name, setName] = useState(existing?.name ?? "")
  const [outputQty, setOutputQty] = useState(existing?.outputQty ?? (kind === "MENU" ? 1 : 0))
  const [outputUomCode, setOutputUomCode] = useState(existing?.outputUomCode ?? (kind === "MENU" ? "PIECE" : "GRAM"))
  const [sellPrice, setSellPrice] = useState(existing?.referenceSellPrice ?? 0)
  const [target, setTarget] = useState((existing?.targetFoodCostPct ?? .33) * 100)
  const [notes, setNotes] = useState(existing?.notes ?? "")
  const [lines, setLines] = useState<DraftLine[]>(() => (existing?.lines ?? []).map((l, i) => {
    const p = l.productId ? products.find((x) => x.id === l.productId) : null
    return { key: `old-${i}`, kind: l.kind, category: p?.category ?? categories[0] ?? "", productId: l.productId ?? "", quantity: l.quantity, uomCode: l.uomCode ?? p?.uomCode ?? "PIECE", label: l.label ?? "Cost adjustment", fixedUnitCost: l.fixedUnitCost ?? 0 }
  }))
  const [aliases, setAliases] = useState(existing?.aliases ?? [])
  const [posToAdd, setPosToAdd] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const control = "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-[13px] focus:border-coral-500 focus:outline-none focus:ring-2 focus:ring-coral-500/20"
  const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500"

  const previewCost = lines.reduce((sum, line) => line.kind === "COST_ADJUSTMENT" ? sum + line.quantity * line.fixedUnitCost : sum + line.quantity * (productById.get(line.productId)?.unitCost ?? 0), 0)
  const cost = existing?.cost.totalCost ?? previewCost

  function addProductLine() {
    const category = categories[0] ?? ""
    const product = products.find((p) => p.category === category) ?? products[0]
    if (!product) return
    setLines((rows) => [...rows, { key: crypto.randomUUID(), kind: "PRODUCT", category: product.category, productId: product.id, quantity: 1, uomCode: product.uomCode, label: "", fixedUnitCost: 0 }])
  }
  function addAdjustment() { setLines((rows) => [...rows, { key: crypto.randomUUID(), kind: "COST_ADJUSTMENT", category: "", productId: "", quantity: 1, uomCode: "", label: "Cost adjustment", fixedUnitCost: 0 }]) }
  function patchLine(key: string, patch: Partial<DraftLine>) { setLines((rows) => rows.map((r) => r.key === key ? { ...r, ...patch } : r)) }
  function addPosAlias() {
    const pos = posItems.find((p) => p.id === posToAdd)
    if (!pos || aliases.some((a) => a.posItemId === pos.id)) return
    setAliases((a) => [...a, { title: pos.title, posItemId: pos.id, isPrimary: a.length === 0 }]); setPosToAdd("")
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true)
    const result = await saveRecipe({
      id: existing?.id, name, kind, outputProductId: existing?.outputProductId ?? null, outputQty, outputUomCode,
      referenceSellPrice: kind === "MENU" ? sellPrice : null, targetFoodCostPct: target / 100, notes,
      lines: lines.map((l) => l.kind === "PRODUCT" ? { kind: "PRODUCT" as const, productId: l.productId, quantity: l.quantity, uomCode: l.uomCode } : { kind: "COST_ADJUSTMENT" as const, label: l.label, quantity: l.quantity, fixedUnitCost: l.fixedUnitCost }),
      aliases: kind === "MENU" ? aliases : [],
    })
    setBusy(false)
    if (!result.ok) { setError(result.error ?? "Could not save recipe."); return }
    router.push(kind === "MENU" ? "/h8/costing/recipes" : "/h8/costing/semis"); router.refresh()
  }

  return <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
    <div className="space-y-5">
      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-2"><div><label className={label}>Recipe name</label><input className={control} value={name} onChange={(e) => setName(e.target.value)} required /></div>
          {kind === "MENU" ? <div><label className={label}>Reference selling price</label><input className={control} type="number" min="0.01" step="any" value={sellPrice || ""} onChange={(e) => setSellPrice(Number(e.target.value))} required /></div> : <div><label className={label}>Output product</label><input className={control} value={existing?.name ?? name} disabled /></div>}
          <div><label className={label}>Batch output quantity</label><input className={control} type="number" min="0.000001" step="any" value={outputQty || ""} onChange={(e) => setOutputQty(Number(e.target.value))} required /></div>
          <div><label className={label}>Output unit</label><select className={control} value={outputUomCode} onChange={(e) => setOutputUomCode(e.target.value)} disabled={kind === "MENU"}>{uoms.map((u) => <option key={u.code} value={u.code}>{u.code} — {u.name}</option>)}</select></div>
          <div><label className={label}>Target food cost %</label><input className={control} type="number" min="1" max="100" step=".1" value={target} onChange={(e) => setTarget(Number(e.target.value))} /></div>
        </div>
        <div className="mt-4"><label className={label}>Notes / yield assumptions</label><textarea className={control} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3"><div><h2 className="font-display text-sm font-semibold text-stone-800">Recipe lines</h2><p className="text-[11px] text-stone-400">Choose category, then ingredient. Semi-finished products are available as reusable inputs.</p></div><div className="flex gap-2"><button type="button" onClick={addProductLine} className="rounded-md bg-coral-50 px-2.5 py-1.5 text-xs font-medium text-coral-700">+ Ingredient</button><button type="button" onClick={addAdjustment} className="rounded-md bg-stone-100 px-2.5 py-1.5 text-xs font-medium text-stone-600">+ Fixed cost</button></div></div>
        <div className="divide-y divide-stone-100">{lines.length === 0 ? <div className="p-8 text-center text-sm text-stone-400">Add the first ingredient.</div> : lines.map((line, index) => <div key={line.key} className="grid items-end gap-2 p-3 md:grid-cols-[28px_1fr_1.5fr_110px_80px_32px]">
          <div className="pb-2 text-center text-xs text-stone-300">{index + 1}</div>
          {line.kind === "PRODUCT" ? <><div><label className={label}>Category</label><select className={control} value={line.category} onChange={(e) => { const category = e.target.value; const p = products.find((x) => x.category === category); patchLine(line.key, { category, productId: p?.id ?? "", uomCode: p?.uomCode ?? "PIECE" }) }}>{categories.map((c) => <option key={c}>{c}</option>)}</select></div><div><label className={label}>Ingredient</label><select className={control} value={line.productId} onChange={(e) => { const p = productById.get(e.target.value); patchLine(line.key, { productId: e.target.value, category: p?.category ?? line.category, uomCode: p?.uomCode ?? line.uomCode }) }}>{products.filter((p) => p.category === line.category).map((p) => <option key={p.id} value={p.id}>{p.kind === "SEMI_FINISHED" ? "SEMI · " : ""}{p.name}</option>)}</select></div></> : <><div className="md:col-span-2"><label className={label}>Fixed-cost label</label><input className={control} value={line.label} onChange={(e) => patchLine(line.key, { label: e.target.value })} /></div></>}
          <div><label className={label}>Quantity</label><input className={control} type="number" min="0.000001" step="any" value={line.quantity} onChange={(e) => patchLine(line.key, { quantity: Number(e.target.value) })} /></div>
          <div><label className={label}>{line.kind === "PRODUCT" ? "Unit" : "Rs/unit"}</label>{line.kind === "PRODUCT" ? <input className={control} value={line.uomCode} disabled /> : <input className={control} type="number" min="0" step="any" value={line.fixedUnitCost} onChange={(e) => patchLine(line.key, { fixedUnitCost: Number(e.target.value) })} />}</div>
          <button type="button" onClick={() => setLines((r) => r.filter((x) => x.key !== line.key))} className="mb-2 text-lg text-stone-300 hover:text-red-500" title="Remove">×</button>
        </div>)}</div>
      </section>

      {kind === "MENU" && <section className="rounded-xl border border-stone-200 bg-white p-5"><h2 className="font-display text-sm font-semibold text-stone-800">POS aliases</h2><p className="mt-0.5 text-[11px] text-stone-400">Map every spelling/channel item to this one recipe. Theoretical usage uses the POS item ID first.</p>
        <div className="mt-3 flex gap-2"><select className={control} value={posToAdd} onChange={(e) => setPosToAdd(e.target.value)}><option value="">Choose POS item…</option>{posItems.filter((p) => !aliases.some((a) => a.posItemId === p.id)).map((p) => <option key={p.id} value={p.id}>{p.title} · {p.category ?? "No category"} · Rs {p.price}</option>)}</select><button type="button" onClick={addPosAlias} className="shrink-0 rounded-lg bg-stone-100 px-3 text-sm font-medium text-stone-700">Add</button></div>
        <div className="mt-3 space-y-2">{aliases.map((a, i) => <div key={`${a.posItemId}-${i}`} className="flex items-center gap-3 rounded-lg bg-stone-50 px-3 py-2 text-sm"><label className="flex items-center gap-1.5 text-xs"><input type="radio" name="primary" checked={a.isPrimary} onChange={() => setAliases((rows) => rows.map((x, j) => ({ ...x, isPrimary: j === i })))} /> Primary</label><span className="flex-1 font-medium text-stone-700">{a.title}</span><span className="text-xs tabular-nums text-stone-400">POS #{a.posItemId}</span><button type="button" onClick={() => setAliases((rows) => rows.filter((_, j) => j !== i))} className="text-stone-300 hover:text-red-500">×</button></div>)}</div>
      </section>}
    </div>

    <aside><div className="sticky top-6 rounded-xl border border-stone-200 bg-white p-5"><div className="text-[10.5px] font-semibold uppercase tracking-wide text-stone-400">{existing ? `Current revision · live recompute after save` : "Draft estimate"}</div><div className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">Rs {cost.toLocaleString("en-PK", { maximumFractionDigits: 2 })}</div><div className="mt-1 text-xs text-stone-400">{kind === "MENU" ? `Food cost ${sellPrice > 0 ? ((cost / sellPrice) * 100).toFixed(1) + "%" : "—"}` : `${outputQty > 0 ? `Rs ${(cost / outputQty).toFixed(4)}` : "—"} / ${outputUomCode}`}</div>{existing?.cost.flags.length ? <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{existing.cost.flags.map((f) => <div key={f.message}>• {f.message}</div>)}</div> : null}<div className="mt-5 space-y-2"><button disabled={busy} className="w-full rounded-lg bg-coral-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-coral-700 disabled:opacity-60">{busy ? "Saving revision…" : existing ? "Save new revision" : "Create recipe"}</button><button type="button" onClick={() => router.back()} className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-500 hover:bg-stone-50">Cancel</button></div>{error && <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}</div></aside>
  </form>
}
