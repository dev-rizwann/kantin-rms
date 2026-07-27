import type { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import type { Role } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
      kantinSlug: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
    kantinSlug: string | null
  }
}

/**
 * Sign in with either a full email ("harun@iespl.org") or just the username
 * part ("harun"). The bare form is only accepted when it identifies exactly
 * one account — if two users share a local part across domains it is rejected
 * rather than guessed, so a login can never resolve to the wrong person.
 */
async function resolveUser(identifier: string) {
  const exact = await prisma.user.findUnique({ where: { email: identifier } })
  if (exact || identifier.includes("@")) return exact

  const matches = await prisma.user.findMany({
    where: { email: { startsWith: `${identifier}@`, mode: "insensitive" } },
    take: 2,
  })
  return matches.length === 1 ? matches[0] : null
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const identifier = credentials.email.toLowerCase().trim()
        const user = await resolveUser(identifier)

        if (!user || !user.isActive) return null

        const ok = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!ok) return null

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          kantinSlug: user.kantinSlug,
        } as any
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 }, // 7 days
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as any
        token.id = u.id
        token.role = u.role
        token.kantinSlug = u.kantinSlug
        token.name = u.name
        token.email = u.email
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.kantinSlug = token.kantinSlug
        session.user.name = token.name as string
        session.user.email = token.email as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
