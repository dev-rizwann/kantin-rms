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
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 font-display text-xl font-bold text-white">K</div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">IESPL</div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-stone-900">Kantin RMS</h1>
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
