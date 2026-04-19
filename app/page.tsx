import { createClient } from '@/lib/supabase/server'
import { signInWithGoogle } from '@/lib/actions/auth'

type MatchUser = { name: string; role: string; allow_feature: boolean } | null

type FeaturedOutcome = {
  id: string
  title: string
  description: string
  matches: { user1: MatchUser; user2: MatchUser } | null
}

export default async function SplashPage() {
  const supabase = await createClient()

  const { data: outcomes, error: outcomesError } = await supabase
    .from('outcomes')
    .select(`
      id, title, description,
      matches (
        user1:users!user1_id(name, role, allow_feature),
        user2:users!user2_id(name, role, allow_feature)
      )
    `)
    .eq('featured', true)
    .limit(3)
    .returns<FeaturedOutcome[]>()

  if (outcomesError) console.error('[SplashPage] outcomes query failed:', outcomesError)

  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1a1a1a]">
        <span style={{ fontFamily: 'var(--font-anton)', letterSpacing: '0.06em', fontSize: '18px' }}>
          BC
        </span>
        <span className="text-[11px] text-[#444] tracking-widest uppercase">Builder Collab</span>
      </nav>

      {/* Hero — centred */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="text-[11px] text-[#ff2d00] tracking-[0.2em] uppercase mb-6">
          // 34 builders. 12 matched this week.
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-anton)',
            fontSize: 'clamp(52px, 11vw, 100px)',
            lineHeight: 0.92,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            color: '#fff',
          }}
          className="mb-8 max-w-3xl"
        >
          Got something<br />
          you want to<br />
          <span style={{ color: '#ff2d00' }}>ship?</span>
        </h1>

        {/* Subtitle — bigger, readable */}
        <p
          className="mb-4 max-w-lg leading-relaxed"
          style={{ fontSize: '17px', color: '#aaa', fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}
        >
          Whether it&apos;s a side project, a SaaS, or just an idea in your head —
          we connect you with the right person to build it with.
        </p>
        <p
          className="mb-12 max-w-md leading-relaxed"
          style={{ fontSize: '14px', color: '#555', fontFamily: 'var(--font-mono)' }}
        >
          Get one AI-curated match per week, or browse builders and
          start the conversation yourself. Co-founder, collaborator, or just a good chat.
        </p>

        <form action={signInWithGoogle}>
          <button type="submit" className="btn-gradient px-10 py-4 text-[12px]">
            FIND_MY_MATCH →
          </button>
        </form>

        {/* Value props */}
        <div className="flex items-center gap-8 mt-10">
          {[
            { label: '1 match / week', desc: 'AI-curated' },
            { label: 'Browse builders', desc: 'Self-directed' },
            { label: 'You decide the collab', desc: 'Co-founder to quick chat' },
          ].map(({ label, desc }) => (
            <div key={label} className="text-center">
              <div className="text-[11px] text-white font-semibold tracking-wide">{label}</div>
              <div className="text-[10px] text-[#333] tracking-widest uppercase mt-0.5">{desc}</div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex gap-12 mt-14 pt-8 border-t border-[#1a1a1a]">
          {[
            { n: '12', l: 'Matched' },
            { n: '34', l: 'Builders' },
            { n: '∞', l: 'Collab types' },
          ].map(({ n, l }) => (
            <div key={l} className="text-center">
              <div style={{ fontFamily: 'var(--font-anton)', fontSize: '32px', color: '#ff2d00', lineHeight: 1 }}>
                {n}
              </div>
              <div className="text-[9px] text-[#333] tracking-[0.15em] uppercase mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured outcomes */}
      {outcomes && outcomes.length > 0 && (
        <section className="px-8 pb-16 max-w-3xl mx-auto w-full">
          <div className="text-[9px] text-[#333] tracking-[0.2em] uppercase mb-5 text-center">
            Recently_connected /
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#1a1a1a]">
            {outcomes.map((outcome) => {
              const m = outcome.matches
              const showNames = m?.user1?.allow_feature && m?.user2?.allow_feature
              return (
                <div key={outcome.id} className="glass-card p-5">
                  <p className="text-[12px] font-semibold text-white mb-1 leading-snug">{outcome.title}</p>
                  <p className="text-[11px] text-[#444] leading-relaxed mb-3">{outcome.description}</p>
                  <p className="text-[9px] text-[#2a2a2a] tracking-wide uppercase">
                    {showNames && m?.user1 && m?.user2
                      ? `${m.user1.name} × ${m.user2.name}`
                      : 'Two builders'}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
