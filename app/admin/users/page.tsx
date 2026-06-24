import { requireAdmin } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { shortDateTime } from "@/lib/format"
import Link from "next/link"

export default async function AdminUsersPage() {
  await requireAdmin()
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      kantinSlug: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  })

  return (
    <main className="min-h-screen bg-slate-50 px-6 md:px-12 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/" className="text-xs text-blue-600 hover:underline">
              ← Back to landing
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">User management</h1>
            <p className="text-sm text-slate-500 mt-1">
              {users.length} user{users.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            disabled
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md opacity-50 cursor-not-allowed"
            title="Create user — coming next"
          >
            + New user
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Kantin</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-700">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{u.kantinSlug ?? "All"}</td>
                  <td className="px-4 py-3">
                    {u.isActive ? (
                      <span className="text-emerald-700 text-xs font-medium">Active</span>
                    ) : (
                      <span className="text-slate-400 text-xs">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {shortDateTime(u.lastLoginAt?.toISOString() ?? null)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Full CRUD (create, edit, deactivate, role + kantin scoping) comes next.
        </p>
      </div>
    </main>
  )
}
