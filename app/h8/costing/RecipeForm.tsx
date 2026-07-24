"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { saveRecipe } from "./actions"

type ProductOption = { id: string; name: string; kind: string; category: string; uomCode: string; unitCost: number | null }
type PosOption = { id: string; title: string; category: string | null; price: number }
type Existing = {
  id: string; name: string; kind: "SEMI_FINISHED" | "MENU"; outputProductId: string | null; outputQty: number; outputUomCode: string
  referenceSellPrice: number | null; targetFoodCostPct: number; notes: string | null
  lines: { kind: "PRODUCT" | "COST_ADJUSTMENT" | "FRYING_OIL"; productId: string | null; label: string | null; quantity: number; uomCode: string | null; fixedUnitCost: number | null }[]
  aliases: { title: string; posItemId: string; isPrimary: boolean }[]
  cost: { totalCost: number; costPerOutputUnit: number | null; flags: { message: string }[] }
}
interface Props { kind: "SEMI_FINISHED" | "MENU"; products: ProductOption[]; uoms: { code: string; name: string; dimension: string }[]; posItems: PosOption[]; fryingRate: number; existing?: Existing | null }
type DraftLine = { key: string; kind: "PRODUCT" | "COST_ADJUSTMENT" | "FRYING_OIL"; category: string; productId: string; quantity: number; uomCode: string; label: string; fixedUnitCost: number }

/** Takes the food-cost fraction directly (cost ÷ price) so it always agrees
 *  with the FC% figure beside it — never re-derives from a different price. */
function CostDonut({ pct }: { pct: number }) {
  const r = 26
  const circumference = 2 * Math.PI * r
  const share = Math.min(1, Math.max(0, pct))
  const loss = pct >= 1
  const shown = pct * 100
  return (
    <div className="relative h-[74px] w-[74px] shrink-0" title={`Cost ${shown.toFixed(1)}% of price — profit ${(100 - shown).toFixed(1)}%`}>
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke={loss ? "rgba(248,113,113,.22)" : "#97cc57"} strokeWidth="8" opacity={loss ? 1 : 0.85} />
        <circle cx="32" cy="32" r={r} fill="none" stroke={loss ? "#f87171" : "#e96047"} strokeWidth="8" strokeDasharray={`${share * circumference} ${circumference}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <div>
          <div className={"text-[12px] font-bold tabular-nums " + (loss ? "text-red-300" : "text-white/90")}>{shown.toFixed(0)}%</div>
          <div className="mt-0.5 text-[7.5px] font-semibold uppercase tracking-wide text-white/35">cost</div>
        </div>
      </div>
    </div>
  )
}

export function RecipeForm({ kind, products, uoms, posItems, fryingRate, existing }: Props) {
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
    return { key: `old-${i}`, kind: l.kind, category: p?.category ?? categories[0] ?? "", productId: l.productId ?? "", quantity: l.quantity, uomCode: l.uomCode ?? p?.uomCode ?? "PIECE", label: l.label ?? "Cost adjustment", fixedUnitCost: l.kind === "FRYING_OIL" ? fryingRate : l.fixedUnitCost ?? 0 }
  }))
  const [aliases, setAliases] = useState(existing?.aliases ?? [])
  const [posToAdd, setPosToAdd] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const control = "form-control"
  const label = "form-label"

  const lineCost = (line: DraftLine) => line.kind === "PRODUCT" ? line.quantity * (productById.get(line.productId)?.unitCost ?? 0) : line.quantity * (line.kind === "FRYING_OIL" ? fryingRate : line.fixedUnitCost)
  const previewCost = lines.reduce((sum, line) => sum + lineCost(line), 0)
  const cost = previewCost
  const foodCostPct = kind === "MENU" && sellPrice > 0 ? cost / sellPrice : null
  const foodCostTone = foodCostPct == null ? "bg-stone-300" : foodCostPct > .75 ? "bg-red-500" : foodCostPct > .55 ? "bg-amber-500" : "bg-leaf-500"
  const suggestedPrice = kind === "MENU" && target > 0 && cost > 0 ? cost / (target / 100) : null
  const suggestedRounded = suggestedPrice == null ? null : Math.ceil(suggestedPrice / 10) * 10
  const primaryAlias = aliases.find((a) => a.isPrimary) ?? aliases[0] ?? null
  const posPrice = primaryAlias ? posItems.find((p) => p.id === primaryAlias.posItemId)?.price ?? null : null
  const posFoodCostPct = posPrice != null && posPrice > 0 && cost > 0 ? cost / posPrice : null

  function addProductLine() {
    const category = categories[0] ?? ""
    const product = products.find((p) => p.category === category) ?? products[0]
    if (!product) return
    setLines((rows) => [...rows, { key: crypto.randomUUID(), kind: "PRODUCT", category: product.category, productId: product.id, quantity: 1, uomCode: product.uomCode, label: "", fixedUnitCost: 0 }])
  }
  function addFryingLine() { setLines((rows) => [...rows, { key: crypto.randomUUID(), kind: "FRYING_OIL", category: "", productId: "", quantity: 100, uomCode: "GRAM", label: "Deep-fry oil", fixedUnitCost: fryingRate }]) }
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
      lines: lines.map((l) => l.kind === "PRODUCT" ? { kind: "PRODUCT" as const, productId: l.productId, quantity: l.quantity, uomCode: l.uomCode } : l.kind === "FRYING_OIL" ? { kind: "FRYING_OIL" as const, quantity: l.quantity } : { kind: "COST_ADJUSTMENT" as const, label: l.label, quantity: l.quantity, fixedUnitCost: l.fixedUnitCost }),
      aliases: kind === "MENU" ? aliases : [],
    })
    setBusy(false)
    if (!result.ok) { setError(result.error ?? "Could not save recipe."); return }
    router.push(kind === "MENU" ? "/h8/costing/recipes" : "/h8/costing/semis"); router.refresh()
  }

  return <form onSubmit={submit} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
    <div className="space-y-4">
      <section className="editor-card">
        <div className="editor-card-head">
          <div className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-coral-50 text-xs font-bold text-coral-700 ring-1 ring-coral-100">01</span><div><h2 className="font-display text-[15px] font-semibold text-stone-900">Recipe identity & yield</h2><p className="mt-0.5 text-[11px] text-stone-400">Define what the kitchen produces before adding its inputs.</p></div></div>
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500">{kind === "MENU" ? "Menu item" : "Kitchen batch"}</span>
        </div>
        <div className="grid gap-x-4 gap-y-3 p-4 md:grid-cols-2">
          <div className="md:col-span-2"><label className={label}>Recipe name</label><input className={control + " text-[14px] font-medium"} value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "MENU" ? "e.g. Tender Pops with Fries" : "e.g. House Sauce"} required /><p className="form-hint">Use the name your kitchen team recognizes on prep sheets.</p></div>
          {kind === "MENU" ? <div><label className={label}>Reference selling price</label><div className="relative"><span className="field-adornment left-3">Rs</span><input className={control + " pl-10 text-right font-semibold tabular-nums"} type="number" min="0.01" step="any" value={sellPrice || ""} onChange={(e) => setSellPrice(Number(e.target.value))} required /></div><p className="form-hint">Current selling price used for margin and food-cost checks.</p></div> : <div><label className={label}>Output product</label><input className={control} value={existing?.name ?? name} disabled /><p className="form-hint">Created automatically as a reusable semi-finished ingredient.</p></div>}
          <div><label className={label}>{kind === "MENU" ? "Portions produced" : "Actual batch yield"}</label><div className="relative"><input className={control + " pr-20 text-right font-semibold tabular-nums"} type="number" min="0.000001" step="any" value={outputQty || ""} onChange={(e) => setOutputQty(Number(e.target.value))} required /><span className="field-adornment right-3">{outputUomCode}</span></div><p className="form-hint">Yield is the denominator used to calculate cost per output unit.</p></div>
          <div><label className={label}>Output unit</label><select className={control} value={outputUomCode} onChange={(e) => setOutputUomCode(e.target.value)} disabled={kind === "MENU"}>{uoms.map((u) => <option key={u.code} value={u.code}>{u.name} · {u.code}</option>)}</select></div>
          <div><label className={label}>Target food cost</label><div className="relative"><input className={control + " pr-9 text-right font-semibold tabular-nums"} type="number" min="1" max="100" step=".1" value={target} onChange={(e) => setTarget(Number(e.target.value))} /><span className="field-adornment right-3">%</span></div></div>
          <div className="md:col-span-2"><label className={label}>Kitchen notes & yield assumptions</label><textarea className={control + " min-h-24 resize-y leading-relaxed"} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Prep method, trim loss, cooked yield, portioning notes…" /></div>
        </div>
      </section>

      <section className="editor-card">
        <div className="editor-card-head">
          <div className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-leaf-50 text-xs font-bold text-leaf-700 ring-1 ring-leaf-100">02</span><div><h2 className="font-display text-[15px] font-semibold text-stone-900">Ingredients & cost drivers</h2><p className="mt-0.5 text-[11px] text-stone-400">Add actual quantities. For deep frying, enter only the food weight entering the fryer.</p></div></div>
          <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={addProductLine} className="btn-soft"><span className="mr-1 text-base leading-none">+</span> Ingredient</button><button type="button" onClick={addFryingLine} className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100">+ Deep-fried weight</button><button type="button" onClick={addAdjustment} className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-50">+ Fixed cost</button></div>
        </div>
        <div className="space-y-2.5 p-3">{lines.length === 0 ? <div className="rounded-xl border border-dashed border-stone-250 bg-stone-50/70 px-6 py-12 text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white text-xl text-coral-500 shadow-sm">+</div><div className="mt-3 text-sm font-medium text-stone-600">Start with the first ingredient</div><p className="mt-1 text-xs text-stone-400">Each line shows its current cost contribution before you save.</p><button type="button" onClick={addProductLine} className="btn-soft mt-4">Add ingredient</button></div> : lines.map((line, index) => {
          const selectedProduct = productById.get(line.productId)
          const isSemi = selectedProduct?.kind === "SEMI_FINISHED"
          const estimatedLineCost = lineCost(line)
          return <article key={line.key} className={"rounded-xl border p-3 transition " + (line.kind === "FRYING_OIL" ? "border-amber-200 bg-amber-50/45" : line.kind === "COST_ADJUSTMENT" ? "border-stone-200 bg-stone-50/65" : isSemi ? "border-leaf-200 bg-leaf-50/35" : "border-stone-200 bg-white shadow-[0_5px_18px_rgba(120,96,70,.045)]")}>
            <div className="mb-2 flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-lg bg-stone-900 text-[10px] font-bold tabular-nums text-white">{String(index + 1).padStart(2, "0")}</span><span className={"rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider " + (line.kind === "FRYING_OIL" ? "bg-amber-100 text-amber-800" : line.kind === "COST_ADJUSTMENT" ? "bg-stone-200 text-stone-600" : isSemi ? "bg-leaf-100 text-leaf-800" : "bg-coral-50 text-coral-700")}>{line.kind === "FRYING_OIL" ? "Deep-fried input" : line.kind === "COST_ADJUSTMENT" ? "Fixed allocation" : isSemi ? "Semi-finished" : "Ingredient"}</span><span className="ml-auto text-[10px] uppercase tracking-wide text-stone-400">Line estimate <strong className="ml-1 text-xs font-semibold normal-case tabular-nums text-stone-700">Rs {estimatedLineCost.toLocaleString("en-PK", { maximumFractionDigits: 2 })}</strong></span><button type="button" onClick={() => setLines((r) => r.filter((x) => x.key !== line.key))} className="ml-2 grid h-7 w-7 place-items-center rounded-lg text-base text-stone-300 transition hover:bg-red-50 hover:text-red-500" title="Remove line" aria-label={`Remove line ${index + 1}`}>×</button></div>
            <div className="grid items-end gap-2.5 md:grid-cols-12">
              {line.kind === "PRODUCT" ? <><div className="md:col-span-3"><label className={label}>Category</label><select className={control} value={line.category} onChange={(e) => { const category = e.target.value; const p = products.find((x) => x.category === category); patchLine(line.key, { category, productId: p?.id ?? "", uomCode: p?.uomCode ?? "PIECE" }) }}>{categories.map((c) => <option key={c}>{c}</option>)}</select></div><div className="md:col-span-5"><label className={label}>Ingredient or preparation</label><select className={control + " font-medium"} value={line.productId} onChange={(e) => { const p = productById.get(e.target.value); patchLine(line.key, { productId: e.target.value, category: p?.category ?? line.category, uomCode: p?.uomCode ?? line.uomCode }) }}>{products.filter((p) => p.category === line.category).map((p) => <option key={p.id} value={p.id}>{p.kind === "SEMI_FINISHED" ? "SEMI · " : ""}{p.name}</option>)}</select></div></> : line.kind === "FRYING_OIL" ? <div className="md:col-span-8"><label className={label}>Deep-fried input</label><input className={control + " font-medium"} value="Deep-fry oil — all fried items, one flat rate" disabled /><p className="form-hint">Enter the uncooked food weight entering the fryer (fries + breaded together). Oil cost is automatic.</p></div> :<div className="md:col-span-8"><label className={label}>Allocation label</label><input className={control} value={line.label} onChange={(e) => patchLine(line.key, { label: e.target.value })} placeholder="e.g. Labour allocation" /></div>}
              <div className="md:col-span-2"><label className={label}>{line.kind === "FRYING_OIL" ? "Fried weight" : "Quantity"}</label><input className={control + " text-right font-semibold tabular-nums"} type="number" min="0.000001" step="any" value={line.quantity} onChange={(e) => patchLine(line.key, { quantity: Number(e.target.value) })} /></div>
              <div className="md:col-span-2"><label className={label}>{line.kind === "PRODUCT" ? "Unit" : line.kind === "FRYING_OIL" ? "Oil rate / g" : "Cost / unit"}</label>{line.kind === "PRODUCT" ? <input className={control + " text-center font-semibold text-stone-500"} value={line.uomCode} disabled /> : line.kind === "FRYING_OIL" ? <div className="relative"><span className="field-adornment left-3">Rs</span><input className={control + " pl-9 text-right font-semibold tabular-nums text-amber-800"} value={fryingRate.toFixed(6)} disabled /></div> : <div className="relative"><span className="field-adornment left-3">Rs</span><input className={control + " pl-9 text-right font-semibold tabular-nums"} type="number" min="0" step="any" value={line.fixedUnitCost} onChange={(e) => patchLine(line.key, { fixedUnitCost: Number(e.target.value) })} /></div>}</div>
            </div>
          </article>
        })}</div>
        {lines.length > 0 && <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50/65 px-5 py-3 text-xs"><span className="text-stone-400">{lines.length} cost line{lines.length === 1 ? "" : "s"} in this revision</span><span className="font-semibold tabular-nums text-stone-700">Draft line estimate · Rs {previewCost.toLocaleString("en-PK", { maximumFractionDigits: 2 })}</span></div>}
      </section>

      {kind === "MENU" && <section className="editor-card">
        <div className="editor-card-head"><div className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-50 text-xs font-bold text-amber-700 ring-1 ring-amber-100">03</span><div><h2 className="font-display text-[15px] font-semibold text-stone-900">POS item mapping</h2><p className="mt-0.5 text-[11px] text-stone-400">Connect channel spellings and item IDs to one costing recipe.</p></div></div><span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold text-stone-500">{aliases.length} linked</span></div>
        <div className="p-4"><div className="flex gap-2"><select className={control} value={posToAdd} onChange={(e) => setPosToAdd(e.target.value)}><option value="">Choose an unmapped POS item…</option>{posItems.filter((p) => !aliases.some((a) => a.posItemId === p.id)).map((p) => <option key={p.id} value={p.id}>{p.title} · {p.category ?? "No category"} · Rs {p.price}</option>)}</select><button type="button" onClick={addPosAlias} disabled={!posToAdd} className="btn-secondary shrink-0 disabled:opacity-50">Link item</button></div>
          <div className="mt-4 grid gap-2">{aliases.length === 0 ? <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/45 p-4 text-xs text-amber-800">No POS aliases yet. Link at least one item for price matching and theoretical usage.</div> : aliases.map((a, i) => <div key={`${a.posItemId}-${i}`} className={"flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3 text-sm " + (a.isPrimary ? "border-leaf-200 bg-leaf-50/45" : "border-stone-200 bg-stone-50/55")}><label className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500"><input className="accent-leaf-600" type="radio" name="primary" checked={a.isPrimary} onChange={() => setAliases((rows) => rows.map((x, j) => ({ ...x, isPrimary: j === i })))} /> {a.isPrimary ? "Primary price" : "Make primary"}</label><span className="min-w-40 flex-1 font-semibold text-stone-800">{a.title}</span><span className="rounded-md bg-white px-2 py-1 text-[10.5px] tabular-nums text-stone-400 ring-1 ring-stone-200">POS #{a.posItemId}</span><button type="button" onClick={() => setAliases((rows) => rows.filter((_, j) => j !== i))} className="grid h-7 w-7 place-items-center rounded-lg text-stone-300 hover:bg-red-50 hover:text-red-500" aria-label={`Remove ${a.title}`}>×</button></div>)}</div>
        </div>
      </section>}
    </div>

    <aside><div className="sticky top-6 overflow-hidden rounded-2xl bg-stone-900 text-white shadow-[0_20px_50px_rgba(28,25,23,.18)] ring-1 ring-black/5">
      <div className="relative overflow-hidden p-4"><div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-coral-500/25 blur-2xl" /><div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-leaf-500/15 blur-2xl" /><div className="relative"><div className="flex items-center justify-between"><div className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-white/45">{existing ? "Saved cost · revisioned" : "Draft cost preview"}</div><span className="h-2 w-2 rounded-full bg-leaf-400 shadow-[0_0_12px_rgba(151,204,87,.8)]" /></div><div className="mt-3 font-display text-[27px] font-semibold tracking-tight">Rs {cost.toLocaleString("en-PK", { maximumFractionDigits: 2 })}</div><div className="mt-1 text-xs text-white/45">{kind === "MENU" ? "Total cost per selling portion" : "Total cost of this preparation batch"}</div></div></div>
      <div className="border-y border-white/10 bg-white/[0.035] px-4 py-3.5">
        {kind === "MENU" ? <><div className="flex items-center gap-3">{(foodCostPct != null && cost > 0) && <CostDonut pct={foodCostPct} />}<div className="flex flex-1 items-end justify-between"><div><div className="text-[9.5px] font-semibold uppercase tracking-wider text-white/40">Food cost</div><div className="mt-1 text-xl font-semibold tabular-nums">{foodCostPct == null ? "—" : `${(foodCostPct * 100).toFixed(1)}%`}</div></div><div className="text-right"><div className="text-[9.5px] font-semibold uppercase tracking-wider text-white/40">Gross margin</div><div className={(sellPrice - cost < 0 ? "text-red-300" : "text-leaf-300") + " mt-1 text-base font-semibold tabular-nums"}>{sellPrice > 0 ? `Rs ${(sellPrice - cost).toFixed(2)}` : "—"}</div></div></div></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={foodCostTone + " h-full rounded-full transition-all"} style={{ width: `${Math.min(100, (foodCostPct ?? 0) * 100)}%` }} /></div><div className="mt-1.5 flex justify-between text-[9.5px] text-white/30"><span>Target {target.toFixed(1)}%</span><span>Selling price Rs {sellPrice || "—"}</span></div></> : <div className="flex items-end justify-between"><div><div className="text-[9.5px] font-semibold uppercase tracking-wider text-white/40">Output cost</div><div className="mt-1 text-xl font-semibold tabular-nums">{outputQty > 0 ? `Rs ${(cost / outputQty).toFixed(4)}` : "—"}</div></div><span className="text-xs text-white/45">per {outputUomCode}</span></div>}
      </div>
      {kind === "MENU" && suggestedPrice != null && <div className="border-b border-white/10 px-4 py-3.5">
        <div className="text-[9.5px] font-semibold uppercase tracking-wider text-white/40">Pricing helper</div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] text-white/45">Sell at this to hit {target.toFixed(1)}% food cost</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums text-leaf-300">Rs {suggestedRounded?.toLocaleString("en-PK")} <span className="text-[10px] font-normal text-white/35">(exact {suggestedPrice.toFixed(0)})</span></div>
          </div>
          <button type="button" onClick={() => suggestedRounded != null && setSellPrice(suggestedRounded)} className="shrink-0 rounded-lg border border-leaf-400/25 bg-leaf-400/10 px-3 py-1.5 text-[11px] font-semibold text-leaf-200 transition hover:bg-leaf-400/20">Use as price</button>
        </div>
        {posPrice != null && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs">
            <span className="text-white/50">POS “{primaryAlias?.title}” sells at <strong className="tabular-nums text-white/85">Rs {posPrice.toLocaleString("en-PK")}</strong></span>
            <span className={"font-semibold tabular-nums " + ((posFoodCostPct ?? 0) > .75 ? "text-red-300" : (posFoodCostPct ?? 0) > .55 ? "text-amber-300" : "text-leaf-300")}>{posFoodCostPct == null ? "—" : `FC ${(posFoodCostPct * 100).toFixed(1)}%`}</span>
          </div>
        )}
      </div>}
      {existing?.cost.flags.length ? <div className="mx-4 mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-100"><div className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-red-200/70">Needs attention</div>{existing.cost.flags.map((f) => <div key={f.message} className="mt-1 flex gap-1.5"><span>•</span><span>{f.message}</span></div>)}</div> : <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-leaf-400/15 bg-leaf-400/[0.08] px-3 py-2.5 text-xs text-leaf-200"><span className="grid h-5 w-5 place-items-center rounded-full bg-leaf-400/15 text-[10px]">✓</span> Cost model is complete</div>}
      <div className="space-y-2 p-3.5"><button disabled={busy} className="btn-primary w-full">{busy ? "Saving revision…" : existing ? "Save as new revision" : "Create recipe"}</button><button type="button" onClick={() => router.back()} className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white/50 transition hover:bg-white/5 hover:text-white">Cancel and go back</button>{error && <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-100">{error}</div>}<p className="pt-1 text-center text-[9.5px] leading-relaxed text-white/25">Every save creates an immutable costing revision for audit history.</p></div>
    </div></aside>
  </form>
}
