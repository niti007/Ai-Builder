import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateMatchModal from '@/components/CreateMatchModal'

type AdminUser = {
  id: string
  name: string | null
  email: string
  role: string | null
  goals: string | null
  preferred_time: string | null
  created_at: string
}

type AdminMatch = {
  id: string
  topic: string | null
  status: string | null
  scheduled_time: string | null
  created_at: string
  user1: { name: string | null } | null
  user2: { name: string | null } | null
  outcomes: { title: string | null }[]
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/')
  }

  const [{ data: users }, { data: matches }] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, email, role, goals, preferred_time, created_at')
      .order('created_at', { ascending: false })
      .returns<AdminUser[]>(),
    supabase
      .from('matches')
      .select(`
        id, topic, status, scheduled_time, created_at,
        user1:users!user1_id(name),
        user2:users!user2_id(name),
        outcomes(title)
      `)
      .order('created_at', { ascending: false })
      .returns<AdminMatch[]>(),
  ])

  const statusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-50 text-yellow-700',
      completed: 'bg-green-50 text-green-700',
      skipped: 'bg-red-50 text-red-600',
    }
    return `px-2 py-0.5 rounded text-xs font-medium ${styles[status ?? ''] ?? 'bg-gray-100 text-gray-600'}`
  }

  const modalUsers = (users ?? []).map(u => ({
    id: u.id,
    name: u.name ?? u.email,
    email: u.email,
  }))

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
        <CreateMatchModal users={modalUsers} />
      </div>

      {/* Users table */}
      <section className="mb-12">
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Users{' '}
          <span className="text-gray-400 font-normal">({users?.length ?? 0})</span>
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Role', 'Goals', 'Time', 'Joined'].map(h => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users?.map(u => (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.role}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    <p className="truncate">{u.goals}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.preferred_time}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Matches table */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Matches{' '}
          <span className="text-gray-400 font-normal">({matches?.length ?? 0})</span>
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Pair', 'Topic', 'Status', 'Outcome'].map(h => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matches?.map(m => (
                <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {m.user1?.name ?? '—'} × {m.user2?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    <p className="truncate">{m.topic}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadge(m.status)}>{m.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {m.outcomes?.[0]?.title ?? '\u2014'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
