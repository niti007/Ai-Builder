import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { acceptConnectionRequest, declineConnectionRequest } from '@/lib/actions/connections'

type IncomingRequest = {
  id: string
  message: string
  from_user: { id: string; name: string; role: string; goals: string } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, onboarded')
    .eq('email', user.email!)
    .single()

  if (!profile?.onboarded) redirect('/onboarding')

  const [{ data: match }, { data: incoming }] = await Promise.all([
    supabase
      .from('matches')
      .select('id, topic, scheduled_time, status')
      .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('connection_requests')
      .select('id, message, from_user:users!from_user_id(id, name, role, goals)')
      .eq('to_user_id', profile.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .returns<IncomingRequest[]>(),
  ])

  return (
    <main className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1a1a1a]">
        <span style={{ fontFamily: 'var(--font-anton)', letterSpacing: '0.06em', fontSize: '18px' }}>BC</span>
        <span className="text-[10px] text-[#555] tracking-widest uppercase">{profile.name}</span>
      </nav>

      <div className="flex-1 flex flex-col items-center px-6 py-14">
        <div className="w-full max-w-xl">
          <div className="text-[10px] text-[#ff2d00] tracking-[0.2em] uppercase mb-4 text-center">
            // Your collab hub
          </div>
          <h1
            style={{ fontFamily: 'var(--font-anton)', fontSize: '40px', letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1 }}
            className="mb-10 text-white text-center"
          >
            Hey,<br />{profile.name}.
          </h1>

          {/* Incoming connection requests */}
          {incoming && incoming.length > 0 && (
            <div className="mb-10">
              <div className="text-[9px] text-[#ff2d00] tracking-[0.2em] uppercase mb-4">
                Requests / {incoming.length}
              </div>
              <div className="space-y-px bg-[#1a1a1a]">
                {incoming.map((req) => (
                  <div key={req.id} className="glass-card p-5 border-l-2 border-l-[#ff2d00]">
                    <p className="text-[13px] font-semibold text-white mb-0.5">
                      {req.from_user?.name}
                    </p>
                    <p className="text-[10px] text-[#ff2d00] tracking-[0.1em] uppercase mb-3">
                      {req.from_user?.role}
                    </p>
                    <p className="text-[12px] text-[#888] leading-relaxed mb-4 italic">
                      &ldquo;{req.message}&rdquo;
                    </p>
                    <div className="flex gap-3">
                      <form action={acceptConnectionRequest}>
                        <input type="hidden" name="request_id" value={req.id} />
                        <button type="submit" className="btn-gradient px-5 py-2.5 text-[10px]">
                          ACCEPT →
                        </button>
                      </form>
                      <form action={declineConnectionRequest}>
                        <input type="hidden" name="request_id" value={req.id} />
                        <button type="submit" className="btn-ghost px-5 py-2.5 text-[10px]">
                          Decline
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Match / queue status */}
          {match ? (
            <div className="glass-card p-6 border-l-2 border-l-[#ff2d00] mb-10">
              <div className="text-[9px] text-[#ff2d00] tracking-[0.2em] uppercase mb-3">New_match /</div>
              <p className="text-[15px] font-semibold text-white mb-2 leading-snug">{match.topic}</p>
              {match.scheduled_time && (
                <p className="text-[11px] text-[#666] mb-5">
                  Call:{' '}
                  <span className="text-[#aaa]">
                    {new Date(match.scheduled_time).toLocaleString('en-GB', {
                      weekday: 'short', day: 'numeric', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </p>
              )}
              <Link href={`/match/${match.id}`}>
                <button className="btn-gradient px-6 py-3 text-[11px]">
                  VIEW_MATCH →
                </button>
              </Link>
            </div>
          ) : (
            <div className="glass-card p-6 border-l-2 border-l-[#333] mb-10">
              <div className="text-[9px] text-[#ff2d00] tracking-[0.2em] uppercase mb-3">Status /</div>
              <p className="text-[14px] text-white font-semibold mb-2">You&apos;re in the queue.</p>
              <p className="text-[12px] text-[#888]">We&apos;ll email you when we find your match. Usually within a week.</p>
            </div>
          )}

          {/* Nav CTAs */}
          <div className="flex gap-4">
            <Link href="/collabs" className="flex-1 glass-card p-4 text-center hover:border-[#333] transition-colors group">
              <div className="text-[9px] text-[#ff2d00] tracking-[0.15em] uppercase mb-1">Shipped /</div>
              <div className="text-[11px] text-[#888] group-hover:text-white transition-colors tracking-wide">Browse collabs →</div>
            </Link>
            <Link href="/builders" className="flex-1 glass-card p-4 text-center hover:border-[#333] transition-colors group">
              <div className="text-[9px] text-[#ff2d00] tracking-[0.15em] uppercase mb-1">Platform /</div>
              <div className="text-[11px] text-[#888] group-hover:text-white transition-colors tracking-wide">Browse builders →</div>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
