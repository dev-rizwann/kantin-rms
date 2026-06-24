import { Suspense } from "react"
import { LoginForm } from "./LoginForm"

export const metadata = {
  title: "Sign in · Kantin RMS",
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-widest text-slate-500 font-medium">IESPL</div>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">Kantin RMS</h1>
          <p className="text-sm text-slate-500 mt-2">Sign in to continue</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 md:p-8">
          <Suspense fallback={<div className="text-slate-500 text-sm">Loading…</div>}>
            <LoginForm />
          </Suspense>
        </div>
        <div className="text-center mt-6 text-xs text-slate-500">
          Lost access? Ask your administrator.
        </div>
      </div>
    </main>
  )
}
