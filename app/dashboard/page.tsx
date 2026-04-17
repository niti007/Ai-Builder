import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  const { data: match } = await supabase
    .from('matches')
    .select('id, topic, scheduled_time, status')
    .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <main className="max-w-lg mx-auto px-6 py-16">
      <p className="text-sm text-gray-400 mb-1">Hey, {profile.name}</p>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your collab hub</h1>

      {match ? (
        <div className="border border-gray-200 rounded-2xl p-6">
          <span className="inline-block text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded mb-3">
            New match
          </span>
          <p className="font-semibold text-gray-900 mb-1">{match.topic}</p>
          {match.scheduled_time && (
            <p className="text-sm text-gray-500 mb-4">
              Suggested call:{' '}
              {new Date(match.scheduled_time).toLocaleString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
          <Link
            href={`/match/${match.id}`}
            className="inline-block bg-black text-white px-6 py-2.5 rounded-full font-medium hover:bg-gray-800 transition-colors"
          >
            View your match →
          </Link>
        </div>
      ) : (
        <div className="border border-gray-100 rounded-2xl p-6 bg-gray-50">
          <p className="font-semibold text-gray-700 mb-1">You&apos;re in the queue</p>
          <p className="text-sm text-gray-500">
            We&apos;ll email you when we find your collab partner. Check back soon!
          </p>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gray-100">
        <Link href="/collabs" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          Browse shipped collabs →
        </Link>
      </div>
    </main>
  )
}
