"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get("callbackUrl") ?? "/"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (!result) {
      setError("Something went wrong. Try again.")
      return
    }
    if (result.error) {
      setError("Invalid email or password.")
      return
    }
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>
      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  )
}
