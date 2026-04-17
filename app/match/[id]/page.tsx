import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { submitOutcome } from '@/lib/actions/outcome'
import Link from 'next/link'

type MatchUser = { id: string; name: string; role: string; goals: string }
type Outcome = { id: string; title: string; description: string }

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

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('email', user.email!)
    .single()

  if (!profile) redirect('/onboarding')

  const { data: match } = await supabase
    .from('matches')
    .select(`
      id, topic, intro_text, scheduled_time, status,
      user1:users!user1_id(id, name, role, goals),
      user2:users!user2_id(id, name, role, goals),
      outcomes(id, title, description)
    `)
    .eq('id', id)
    .single()

  if (!match) notFound()

  const matchData = match as unknown as MatchData
  const isUser1 = matchData.user1.id === profile.id
  const isUser2 = matchData.user2.id === profile.id
  if (!isUser1 && !isUser2) notFound()

  const partner = isUser1 ? matchData.user2 : matchData.user1
  const hasOutcome = matchData.outcomes && matchData.outcomes.length > 0

  return (
    <main className="max-w-lg mx-auto px-6 py-16">
      <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-700 mb-6 inline-block">
        ← Dashboard
      </Link>

      <span className="inline-block text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded mb-3">
        Your collab match
      </span>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{matchData.topic}</h1>

      {/* Partner card */}
      <div className="border border-gray-200 rounded-2xl p-5 mb-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Your partner</p>
        <p className="font-semibold text-gray-900">{partner.name}</p>
        <p className="text-sm text-gray-500 mb-2">{partner.role}</p>
        <p className="text-sm text-gray-700">{partner.goals}</p>
      </div>

      {/* LLM intro */}
      {matchData.intro_text && (
        <div className="bg-gray-50 rounded-2xl p-5 mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Why you&apos;re a match</p>
          <p className="text-gray-700 text-sm leading-relaxed">{matchData.intro_text}</p>
        </div>
      )}

      {/* Suggested call time */}
      {matchData.scheduled_time && (
        <p className="text-sm text-gray-500 mb-6">
          Suggested call:{' '}
          <strong>
            {new Date(matchData.scheduled_time).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </strong>
        </p>
      )}

      {/* Outcome */}
      {hasOutcome ? (
        <div className="border border-green-200 bg-green-50 rounded-2xl p-5">
          <p className="font-semibold text-green-700 mb-1">Shipped! 🎉</p>
          <p className="text-sm text-green-600">{matchData.outcomes[0].title}</p>
          {matchData.outcomes[0].description && (
            <p className="text-xs text-green-500 mt-1">{matchData.outcomes[0].description}</p>
          )}
        </div>
      ) : (
        <form action={submitOutcome} className="space-y-3 border border-gray-200 rounded-2xl p-5">
          <p className="text-sm font-medium text-gray-700 mb-1">Did you ship something?</p>
          <input type="hidden" name="match_id" value={matchData.id} />
          <input
            name="title"
            placeholder="What did you build? (e.g. AI LinkedIn Chrome extension)"
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <textarea
            name="description"
            placeholder="One-line description (optional)"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
          />
          <button
            type="submit"
            className="w-full bg-black text-white py-3 rounded-full font-medium hover:bg-gray-800 transition-colors"
          >
            Mark as shipped ✓
          </button>
        </form>
      )}
    </main>
  )
}
