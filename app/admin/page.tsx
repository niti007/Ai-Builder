import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateMatchModal from '@/components/CreateMatchModal'

type AdminUser = {
  id: string; name: string | null; email: string; role: string | null
  goals: string | null; preferred_time: string | null; created_at: string
}
type AdminMatch = {
  id: string; topic: string | null; status: string | null
  scheduled_time: string | null; created_at: string
  user1: { name: string | null } | null; user2: { name: string | null } | null
  outcomes: { title: string | null }[]
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/')

  const [{ data: users }, { data: matches }] = await Promise.all([
    supabase.from('users').select('id, name, email, role, goals, preferred_time, created_at')
      .order('created_at', { ascending: false }).returns<AdminUser[]>(),
    supabase.from('matches').select(`id, topic, status, scheduled_time, created_at,
      user1:users!user1_id(name), user2:users!user2_id(name), outcomes(title)`)
      .order('created_at', { ascending: false }).returns<AdminMatch[]>(),
  ])

  const statusColor = (s: string | null) => ({
    pending: 'text-yellow-500',
    completed: 'text-green-500',
    skipped: 'text-red-500',
  }[s ?? ''] ?? 'text-[#444]')

  const modalUsers = (users ?? []).map(u => ({ id: u.id, name: u.name ?? u.email, email: u.email }))

  return (
    <main className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1a1a1a]">
        <span style={{ fontFamily: 'var(--font-anton)', letterSpacing: '0.06em', fontSize: '18px' }}>BC</span>
        <span className="text-[10px] text-[#ff2d00] tracking-widest uppercase">Admin /</span>
      </nav>

      <div className="flex-1 px-8 py-12 max-w-5xl w-full">
        <div className="flex items-center justify-between mb-10">
          <h1 style={{ fontFamily: 'var(--font-anton)', fontSize: '36px', letterSpacing: '0.02em', textTransform: 'uppercase' }}
            className="text-white">
            Dashboard
          </h1>
          <CreateMatchModal users={modalUsers} />
        </div>

        {/* Users */}
        <section className="mb-12">
          <div className="text-[9px] text-[#333] tracking-[0.2em] uppercase mb-4">
            Users / <span className="text-[#ff2d00]">{users?.length ?? 0}</span>
          </div>
          <div className="border border-[#1a1a1a]">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  {['Name', 'Role', 'Goals', 'Time', 'Joined'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[9px] text-[#333] tracking-[0.15em] uppercase font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users?.map(u => (
                  <tr key={u.id} className="border-t border-[#111] hover:bg-[#111] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-semibold text-[12px]">{u.name}</p>
                      <p className="text-[10px] text-[#333]">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-[#555]">{u.role}</td>
                    <td className="px-4 py-3 max-w-xs"><p className="truncate text-[#555]">{u.goals}</p></td>
                    <td className="px-4 py-3 text-[#444]">{u.preferred_time}</td>
                    <td className="px-4 py-3 text-[10px] text-[#333]">{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Matches */}
        <section>
          <div className="text-[9px] text-[#333] tracking-[0.2em] uppercase mb-4">
            Matches / <span className="text-[#ff2d00]">{matches?.length ?? 0}</span>
          </div>
          <div className="border border-[#1a1a1a]">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  {['Pair', 'Topic', 'Status', 'Outcome'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[9px] text-[#333] tracking-[0.15em] uppercase font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matches?.map(m => (
                  <tr key={m.id} className="border-t border-[#111] hover:bg-[#111] transition-colors">
                    <td className="px-4 py-3 text-white font-semibold">{m.user1?.name ?? '—'} × {m.user2?.name ?? '—'}</td>
                    <td className="px-4 py-3 max-w-xs"><p className="truncate text-[#555]">{m.topic}</p></td>
                    <td className={`px-4 py-3 text-[11px] tracking-widest uppercase ${statusColor(m.status)}`}>{m.status}</td>
                    <td className="px-4 py-3 text-[11px] text-[#333]">{m.outcomes?.[0]?.title ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
