import Link from "next/link"

export default function ChakShahzadPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-xs uppercase tracking-widest text-stone-500 font-medium">
          Islamabad
        </div>
        <h1 className="text-3xl font-bold text-stone-900 mt-2">Chak Shahzad Kantin</h1>
        <p className="text-stone-600 mt-4">
          This location will go live once its POS system is connected and a first sync runs.
        </p>
        <p className="text-stone-500 text-sm mt-2">
          Status: <span className="text-amber-700 font-medium">Coming soon</span>
        </p>
        <Link
          href="/"
          className="inline-block mt-6 text-sm text-coral-600 hover:text-coral-700 font-medium"
        >
          ← Back to all locations
        </Link>
      </div>
    </main>
  )
}
