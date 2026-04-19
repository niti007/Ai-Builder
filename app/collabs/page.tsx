import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type ColabUser = { name: string; role: string; allow_feature: boolean } | null

type OutcomeWithMatch = {
  id: string
  title: string
  description: string
  featured: boolean
  created_at: string
  matches: { user1: ColabUser; user2: ColabUser } | null
}

export default async function CollabsPage() {
  const supabase = await createClient()

  const { data: outcomes, error } = await supabase
    .from('outcomes')
    .select(`
      id, title, description, featured, created_at,
      matches (
        user1:users!user1_id(name, role, allow_feature),
        user2:users!user2_id(name, role, allow_feature)
      )
    `)
    .order('created_at', { ascending: false })
    .returns<OutcomeWithMatch[]>()

  if (error) console.error('[CollabsPage] outcomes query failed:', error)

  return (
    <main className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1a1a1a]">
        <span style={{ fontFamily: 'var(--font-anton)', letterSpacing: '0.06em', fontSize: '18px' }}>BC</span>
        <Link href="/" className="text-[10px] text-[#333] hover:text-white transition-colors tracking-widest uppercase">← Home</Link>
      </nav>

      <div className="flex-1 flex flex-col items-center px-6 py-14">
        <div className="w-full max-w-2xl">
        <div className="text-[10px] text-[#ff2d00] tracking-[0.2em] uppercase mb-4 text-center">
          // Shipped collabs
        </div>
        <h1
          style={{ fontFamily: 'var(--font-anton)', fontSize: '48px', letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1 }}
          className="mb-2 text-white text-center"
        >
          Real things<br />built.
        </h1>
        <p className="text-[11px] text-[#555] mb-12 tracking-wide text-center">By real pairs of builders.</p>

        <div className="space-y-px bg-[#1a1a1a] w-full">
          {outcomes?.map((outcome) => {
            const m = outcome.matches
            const showNames = m?.user1?.allow_feature && m?.user2?.allow_feature

            return (
              <div
                key={outcome.id}
                className={`glass-card p-5 ${outcome.featured ? 'border-l-2 border-l-[#ff2d00]' : ''}`}
              >
                {outcome.featured && (
                  <span className="text-[9px] text-[#ff2d00] tracking-[0.2em] uppercase block mb-2">
                    Featured /
                  </span>
                )}
                <h3 className="text-[13px] font-semibold text-white">{outcome.title}</h3>
                <p className="text-[11px] text-[#444] mt-1 leading-relaxed">{outcome.description}</p>
                <p className="text-[9px] text-[#2a2a2a] tracking-widest uppercase mt-3">
                  {showNames && m?.user1 && m?.user2
                    ? `${m.user1.name} × ${m.user2.name}`
                    : 'Two builders shipped this'}
                </p>
              </div>
            )
          })}

          {(!outcomes || outcomes.length === 0) && (
            <div className="glass-card p-12 text-center">
              <p className="text-[11px] text-[#333] mb-6 tracking-wide">First collabs coming soon.</p>
              <Link href="/">
                <button className="btn-gradient px-6 py-3 text-[11px]">
                  BE_FIRST →
                </button>
              </Link>
            </div>
          )}
        </div>
        </div>
      </div>
    </main>
  )
}
