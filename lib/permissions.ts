/**
 * Central permission predicate for Kantin RMS.
 *
 * ONE check gates every mutation and protected page:
 *   can(session, action, kantinSlug)
 *     = role-grants-action AND (user is global OR user.kantinSlug === kantinSlug)
 *
 * UI should HIDE (not just disable) actions the role cannot perform, driven by
 * the same predicate.
 */
import type { Role } from "@prisma/client"

export interface SessionUserLike {
  role: Role
  kantinSlug: string | null
}

/**
 * Every gated action in the system. Keep this list as the single source of
 * truth; the matrix below references these.
 */
export type Action =
  // inventory ops
  | "inventory.view"
  | "ledger.view"
  | "grn.create"
  | "grn.post"
  | "grn.cancel"
  | "quick_cash.create"
  | "po.create"
  | "po.send"
  | "po.cancel"
  | "stocktake.start"
  | "stocktake.count"
  | "stocktake.approve"
  | "wastage.log"
  | "adjustment.post"
  | "purchase_return.post"
  | "transfer.create"
  | "transfer.dispatch"
  | "transfer.receive"
  | "transfer.resolve_dispute"
  | "recipe.edit"
  | "product.edit"
  | "product.override"
  | "vendor.edit"
  | "invoice.record"
  | "invoice.approve"
  | "payment.record"
  // reports
  | "report.view"
  | "report.view_cost"
  | "report.view_all"
  | "audit.view"
  | "audit.view_all"
  // admin
  | "user.manage"
  | "kantin.manage"
  | "synctoken.rotate"
  | "master_catalog.edit"
  | "settings.edit_subset"
  | "settings.edit_all"

const MANAGER_ACTIONS: Action[] = [
  "inventory.view", "ledger.view",
  "grn.create", "grn.post", "grn.cancel", "quick_cash.create",
  "po.create", "po.send", "po.cancel",
  "stocktake.start", "stocktake.count", "stocktake.approve",
  "wastage.log", "adjustment.post", "purchase_return.post",
  "transfer.create", "transfer.dispatch", "transfer.receive",
  "recipe.edit", "product.edit", "product.override", "vendor.edit",
  "invoice.record", "invoice.approve", "payment.record",
  "report.view", "report.view_cost", "audit.view",
  "settings.edit_subset",
]

const STOREKEEPER_ACTIONS: Action[] = [
  "inventory.view",
  "grn.create", "quick_cash.create",
  "stocktake.count", "wastage.log",
  "transfer.create",
  "report.view", // non-cost only — enforced by withholding report.view_cost
]

const VIEWER_ACTIONS: Action[] = [
  "inventory.view", "ledger.view", "report.view", "report.view_cost", "audit.view",
]

/** Returns the action set a role is granted (before scope check). */
function grantsFor(role: Role): Set<Action> {
  switch (role) {
    case "ADMIN":
      // Admin gets everything (all actions). Represented by a sentinel handled in can().
      return new Set()
    case "MANAGER":
      return new Set(MANAGER_ACTIONS)
    case "CASHIER":
      return new Set(STOREKEEPER_ACTIONS)
    case "VIEWER":
      return new Set(VIEWER_ACTIONS)
    default:
      return new Set()
  }
}

const ADMIN_ONLY: Action[] = [
  "user.manage", "kantin.manage", "synctoken.rotate", "master_catalog.edit",
  "settings.edit_all", "transfer.resolve_dispute", "audit.view_all", "report.view_all",
]

/**
 * The core predicate.
 * @param user    the session user (role + kantinSlug; null kantinSlug = global)
 * @param action  the gated action
 * @param kantinSlug the kantin the action targets (omit for global/admin actions)
 */
export function can(user: SessionUserLike | null | undefined, action: Action, kantinSlug?: string | null): boolean {
  if (!user) return false

  // scope: global users (kantinSlug === null) pass scope for any kantin.
  const scopeOk = user.kantinSlug == null || kantinSlug == null || user.kantinSlug === kantinSlug

  if (user.role === "ADMIN") {
    // Admin is global by definition and can do everything.
    return true
  }

  // Non-admins can never perform admin-only actions.
  if (ADMIN_ONLY.includes(action)) return false

  if (!scopeOk) return false

  return grantsFor(user.role).has(action)
}

/** Throwing variant for server actions / route handlers. */
export function assertCan(user: SessionUserLike | null | undefined, action: Action, kantinSlug?: string | null): void {
  if (!can(user, action, kantinSlug)) {
    throw new PermissionError(action, kantinSlug ?? undefined)
  }
}

export class PermissionError extends Error {
  constructor(public action: string, public kantinSlug?: string) {
    super(`Permission denied: ${action}${kantinSlug ? ` @ ${kantinSlug}` : ""}`)
    this.name = "PermissionError"
  }
}
