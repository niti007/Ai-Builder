import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type ColabUser = { name: string; role: string; allow_feature: boolean } | null

type OutcomeWithMatch = {
  id: string
  title: string
  description: string
  featured: boolean
  created_at: string
  matches: {
    user1: ColabUser
    user2: ColabUser
  } | null
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
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-700 mb-8 inline-block">
        ← Home
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Shipped collabs</h1>
      <p className="text-gray-500 mb-10">Real things built by real pairs of builders.</p>

      <div className="space-y-4">
        {outcomes?.map((outcome) => {
          const m = outcome.matches
          const showNames = m?.user1?.allow_feature && m?.user2?.allow_feature

          return (
            <div
              key={outcome.id}
              className={`rounded-2xl p-5 border transition-colors ${
                outcome.featured
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              {outcome.featured && (
                <span className="inline-block text-xs font-semibold bg-black text-white px-2 py-0.5 rounded mb-2">
                  Featured
                </span>
              )}
              <h3 className="font-semibold text-gray-900">{outcome.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{outcome.description}</p>
              <p className="text-xs text-gray-400 mt-3">
                {showNames && m?.user1 && m?.user2
                  ? `${m.user1.name} (${m.user1.role}) × ${m.user2.name} (${m.user2.role})`
                  : 'Two builders shipped this'}
              </p>
            </div>
          )
        })}

        {(!outcomes || outcomes.length === 0) && (
          <div className="text-center py-16">
            <p className="text-gray-400">First collabs coming soon.</p>
            <Link href="/" className="text-sm text-black underline mt-3 inline-block">
              Be the first to join →
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
