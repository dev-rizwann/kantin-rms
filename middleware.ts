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
    // Keep authentication away from framework assets and public brand artwork.
    "/((?!api/auth|api/sync|login|_next/static|_next/image|brand/|favicon.ico).*)",
  ],
}
