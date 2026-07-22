"use client"

import { useState } from "react"
import { archiveCostingCategory, createCostingCategory, renameCostingCategory } from "../actions"
import type { CostingCategoryRow } from "@/lib/costing-categories"

export function CategoryManager({ categories, canEdit }: { categories: CostingCategoryRow[]; canEdit: boolean }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true); setError(null)
    const res = await fn()
    setBusy(false)
    if (!res.ok) { setError(res.error ?? "Could not save."); return false }
    window.location.reload()
    return true
  }

  if (!canEdit) return null
  return <div className="mb-3">
    <button type="button" onClick={() => { setOpen((v) => !v); setError(null) }} className="text-[11px] font-semibold text-stone-500 hover:text-coral-700">
      {open ? "▾" : "▸"} Manage categories <span className="text-stone-400">({categories.length})</span>
    </button>
    {open && <div className="editor-card mt-2 p-3">
      {error && <div className="mb-2 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">{error}</div>}
      <div className="mb-3 flex flex-wrap gap-2">
        <input className="form-control h-8 max-w-64 flex-1 py-1 text-[12px]" value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name…"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (name.trim()) run(() => createCostingCategory({ name })) } }} />
        <button type="button" disabled={busy || !name.trim()} onClick={() => run(() => createCostingCategory({ name }))}
          className="rounded-md bg-stone-900 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-40">Add category</button>
      </div>
      <ul className="divide-y divide-stone-100 text-[11.5px] leading-tight">
        {categories.map((c) => <li key={c.id} className="flex items-center gap-2 py-[3px]">
          {editing === c.id
            ? <><input autoFocus className="form-control h-7 max-w-56 flex-1 py-0.5 text-[11.5px]" value={editName} onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); run(() => renameCostingCategory({ id: c.id, name: editName })) } if (e.key === "Escape") setEditing(null) }} />
              <button type="button" disabled={busy} onClick={() => run(() => renameCostingCategory({ id: c.id, name: editName }))} className="rounded bg-stone-900 px-2 py-[2px] text-[10px] font-semibold text-white">Save</button>
              <button type="button" onClick={() => setEditing(null)} className="text-[10px] font-semibold text-stone-400">Cancel</button></>
            : <><span className="flex-1 font-medium text-stone-800">{c.name}</span>
              <span className="tabular-nums text-[10px] text-stone-400">{c.inUse} item{c.inUse === 1 ? "" : "s"}</span>
              {c.id.startsWith("unmanaged:")
                ? <span className="text-[10px] text-stone-300">in use only</span>
                : <><button type="button" onClick={() => { setEditing(c.id); setEditName(c.name); setError(null) }} className="rounded border border-stone-200 bg-white px-2 py-[2px] text-[10px] font-semibold text-stone-600">Rename</button>
                  <button type="button" disabled={busy || c.inUse > 0} title={c.inUse > 0 ? "Move its ingredients elsewhere first" : "Hide this category"}
                    onClick={() => run(() => archiveCostingCategory({ id: c.id }))}
                    className="rounded border border-stone-200 bg-white px-2 py-[2px] text-[10px] font-semibold text-stone-500 disabled:opacity-30">Remove</button></>}</>}
        </li>)}
      </ul>
      <p className="mt-2 text-[10px] text-stone-400">Renaming moves every ingredient in the category with it. A category can only be removed once it is empty.</p>
    </div>}
  </div>
}
