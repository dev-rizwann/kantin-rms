import "server-only"
import { headers } from "next/headers"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { can, assertCan, type Action, type SessionUserLike } from "./permissions"

export interface CurrentUser extends SessionUserLike {
  id: string
  email: string
  name: string
}

export async function currentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    kantinSlug: session.user.kantinSlug,
  }
}

/** Throws if not signed in or not permitted. Returns the user on success. */
export async function requireAction(action: Action, kantinSlug?: string | null): Promise<CurrentUser> {
  const user = await currentUser()
  assertCan(user, action, kantinSlug) // throws PermissionError if user null or denied
  return user as CurrentUser
}

export async function canCurrent(action: Action, kantinSlug?: string | null): Promise<boolean> {
  return can(await currentUser(), action, kantinSlug)
}

export function clientIp(): string | null {
  try {
    const h = headers()
    return (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim() || null
  } catch {
    return null
  }
}
