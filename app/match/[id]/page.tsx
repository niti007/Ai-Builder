import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { submitOutcome } from '@/lib/actions/outcome'
import Link from 'next/link'

type MatchUser = { id: string; name: string; role: string; goals: string }
type Outcome = { id: string; title: string; description: string | null }

type MatchData = {
  id: string
  topic: string
  intro_text: string | null
  scheduled_time: string | null
  status: string
  user1: MatchUser
  user2: MatchUser
  outcomes: Outcome[]
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('users').select('id, onboarded').eq('email', user.email!).single()

  if (!profile?.onboarded) redirect('/onboarding')

  const { data: match } = await supabase
    .from('matches')
    .select(`
      id, topic, intro_text, scheduled_time, status,
      user1:users!user1_id(id, name, role, goals),
      user2:users!user2_id(id, name, role, goals),
      outcomes(id, title, description)
    `)
    .eq('id', id)
    .returns<MatchData[]>()
    .maybeSingle()

  if (!match) notFound()

  const isUser1 = match.user1.id === profile.id
  const isUser2 = match.user2.id === profile.id
  if (!isUser1 && !isUser2) notFound()

  const partner = isUser1 ? match.user2 : match.user1
  const isCompleted = match.status === 'completed'

  return (
    <main className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1a1a1a]">
        <span style={{ fontFamily: 'var(--font-anton)', letterSpacing: '0.06em', fontSize: '18px' }}>BC</span>
        <Link href="/dashboard" className="text-[10px] text-[#333] hover:text-white transition-colors tracking-widest uppercase">← Dashboard</Link>
      </nav>

      <div className="flex-1 px-8 py-14 max-w-2xl">
        <div className="text-[10px] text-[#ff2d00] tracking-[0.2em] uppercase mb-4">
          // Your collab match
        </div>
        <h1
          style={{ fontFamily: 'var(--font-anton)', fontSize: '36px', letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1 }}
          className="mb-8 text-white"
        >
          {match.topic}
        </h1>

        {/* Partner */}
        <div className="glass-card p-5 mb-4 border-l-2 border-l-[#1e1e1e]">
          <div className="text-[9px] text-[#333] tracking-[0.2em] uppercase mb-3">Partner /</div>
          <p className="font-semibold text-white text-[14px]">{partner.name}</p>
          <p className="text-[11px] text-[#444] mt-0.5 mb-2">{partner.role}</p>
          <p className="text-[11px] text-[#555] leading-relaxed">{partner.goals}</p>
        </div>

        {/* AI intro */}
        {match.intro_text && (
          <div className="glass-card p-5 mb-4 border-l-2 border-l-[#ff2d00]">
            <div className="text-[9px] text-[#ff2d00] tracking-[0.2em] uppercase mb-3">Why_you_match /</div>
            <p className="text-[12px] text-[#666] leading-relaxed">{match.intro_text}</p>
          </div>
        )}

        {/* Call time */}
        {match.scheduled_time && (
          <p className="text-[11px] text-[#333] mb-6 tracking-wide">
            CALL:{' '}
            <span className="text-[#888]">
              {new Date(match.scheduled_time).toLocaleString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </p>
        )}

        {/* Outcome */}
        {isCompleted ? (
          <div className="glass-card p-5 border-l-2 border-l-[#22c55e]">
            <div className="text-[9px] text-[#22c55e] tracking-[0.2em] uppercase mb-2">Shipped /</div>
            {match.outcomes[0] && (
              <>
                <p className="text-[13px] text-white">{match.outcomes[0].title}</p>
                {match.outcomes[0].description && (
                  <p className="text-[11px] text-[#444] mt-1">{match.outcomes[0].description}</p>
                )}
              </>
            )}
          </div>
        ) : (
          <form action={submitOutcome} className="glass-card p-5 space-y-3">
            <div className="text-[9px] text-[#333] tracking-[0.2em] uppercase mb-1">Did you ship? /</div>
            <input type="hidden" name="match_id" value={match.id} />
            <input name="title" placeholder="What did you build?" required className="glass-input" />
            <textarea name="description" placeholder="One-line description (optional)" rows={2} className="glass-input resize-none" />
            <button type="submit" className="btn-gradient w-full py-3.5 text-[11px]">
              MARK_AS_SHIPPED ✓
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
