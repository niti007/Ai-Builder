import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SendMessageButton from '@/components/SendMessageButton'

type Builder = {
  id: string
  name: string
  role: string
  goals: string
  bio: string | null
  avatar_url: string | null
}

type RequestStatus = {
  to_user_id: string
  from_user_id: string
  status: string
}

export default async function BuildersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('users').select('id, onboarded').eq('email', user.email!).single()

  if (!profile?.onboarded) redirect('/onboarding')

  const [{ data: builders }, { data: requests }] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, role, goals, bio, avatar_url')
      .eq('onboarded', true)
      .neq('id', profile.id)
      .order('created_at', { ascending: false })
      .returns<Builder[]>(),
    supabase
      .from('connection_requests')
      .select('to_user_id, from_user_id, status')
      .or(`from_user_id.eq.${profile.id},to_user_id.eq.${profile.id}`)
      .returns<RequestStatus[]>(),
  ])

  // map builderId → status from my perspective
  const statusMap: Record<string, 'sent' | 'received' | 'accepted'> = {}
  for (const r of requests ?? []) {
    const otherId = r.from_user_id === profile.id ? r.to_user_id : r.from_user_id
    if (r.status === 'accepted') statusMap[otherId] = 'accepted'
    else if (r.from_user_id === profile.id) statusMap[otherId] = 'sent'
    else statusMap[otherId] = 'received'
  }

  return (
    <main className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1a1a1a]">
        <span style={{ fontFamily: 'var(--font-anton)', letterSpacing: '0.06em', fontSize: '18px' }}>BC</span>
        <Link href="/dashboard" className="text-[10px] text-[#333] hover:text-white transition-colors tracking-widest uppercase">
          ← Dashboard
        </Link>
      </nav>

      <div className="flex-1 flex flex-col items-center px-6 py-14">
        <div className="w-full max-w-xl">
          <div className="text-[10px] text-[#ff2d00] tracking-[0.2em] uppercase mb-4 text-center">
            // Builders on the platform
          </div>
          <h1
            style={{ fontFamily: 'var(--font-anton)', fontSize: '40px', letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1 }}
            className="mb-2 text-white text-center"
          >
            Find your<br />co-builder.
          </h1>
          <p className="text-[12px] text-[#555] mb-10 text-center">
            One message each. If they accept, you&apos;re matched.
          </p>

          {builders && builders.length > 0 ? (
            <div className="space-y-px bg-[#1a1a1a]">
              {builders.map((b) => {
                const status = statusMap[b.id]
                return (
                  <div key={b.id} className="glass-card p-5">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="shrink-0">
                        {b.avatar_url ? (
                          <img
                            src={b.avatar_url}
                            alt={b.name}
                            className="w-12 h-12 rounded-full object-cover border border-[#2a2a2a]"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center">
                            <span className="text-[14px] text-[#444] font-semibold">{b.name[0]}</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[14px] font-semibold text-white mb-0.5">{b.name}</p>
                            <p className="text-[10px] text-[#ff2d00] tracking-[0.1em] uppercase mb-2">{b.role}</p>
                          </div>
                          <div className="shrink-0">
                            {status === 'accepted' && (
                              <span className="text-[10px] text-[#22c55e] tracking-[0.1em] uppercase">Matched ✓</span>
                            )}
                            {status === 'sent' && (
                              <span className="text-[10px] text-[#555] tracking-[0.1em] uppercase">Sent ✓</span>
                            )}
                            {status === 'received' && (
                              <span className="text-[10px] text-[#ff2d00] tracking-[0.1em] uppercase">Wants to connect</span>
                            )}
                            {!status && (
                              <SendMessageButton toUserId={b.id} toName={b.name} />
                            )}
                          </div>
                        </div>

                        {b.bio && (
                          <p className="text-[11px] text-[#666] leading-relaxed mb-2">{b.bio}</p>
                        )}
                        <p className="text-[11px] text-[#444] leading-relaxed">
                          <span className="text-[#333] uppercase tracking-widest text-[9px]">Wants to ship: </span>
                          {b.goals}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <p className="text-[11px] text-[#333] tracking-wide">
                No other builders yet. Invite someone.
              </p>
              <Link href="/" className="text-[10px] text-[#ff2d00] mt-4 inline-block tracking-[0.1em] uppercase">
                Share the link →
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
