import { NextRequest, NextResponse } from "next/server"

/**
 * Basic-auth gate. Set DASHBOARD_PASSWORD in Vercel project env vars.
 * Browser prompts for username/password. Use any username + the configured password.
 */
export function middleware(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD

  // If no password is configured, allow through (useful for first-time deploy)
  if (!password) return NextResponse.next()

  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6))
      const idx = decoded.indexOf(":")
      const supplied = idx >= 0 ? decoded.slice(idx + 1) : decoded
      if (supplied === password) return NextResponse.next()
    } catch {
      /* fall through to 401 */
    }
  }

  return new NextResponse("Auth required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="MutfakPos Dashboard"',
    },
  })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
