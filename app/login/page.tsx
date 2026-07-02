import { Suspense } from "react"
import { LoginForm } from "./LoginForm"

export const metadata = {
  title: "Sign in · Kantin RMS",
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f5f1] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/brand/kantin-logo.png" alt="Kantin — Fresh Choices, Happy Breaks" className="mx-auto mb-5 w-60 rounded-2xl" />
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-coral-700">IESPL · Kantin RMS</div>
          <p className="mt-2 text-sm text-stone-500">Sign in to continue</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_1px_2px_rgba(28,25,23,0.04)] md:p-8">
          <Suspense fallback={<div className="text-sm text-stone-500">Loading…</div>}>
            <LoginForm />
          </Suspense>
        </div>
        <div className="mt-6 text-center text-xs text-stone-500">
          Lost access? Ask your administrator.
        </div>
      </div>
    </main>
  )
}
