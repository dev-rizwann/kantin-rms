import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  },
)

export const config = {
  matcher: [
    // Match everything except: NextAuth API, /api/sync (bearer auth), /login, _next assets, favicon, public files
    "/((?!api/auth|api/sync|login|_next/static|_next/image|favicon.ico).*)",
  ],
}
