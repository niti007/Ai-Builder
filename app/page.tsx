import { createClient } from '@/lib/supabase/server'
import { signInWithGoogle } from '@/lib/actions/auth'

export default async function SplashPage() {
  const supabase = await createClient()

  const { data: outcomes } = await supabase
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

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-4">
          Find your AI-builder collab
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto">
          1–2 week micro-collabs for AI engineers, founders, and creators.
          Ship something real with someone who gets it.
        </p>
        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-black text-white px-8 py-3.5 rounded-full font-medium text-lg hover:bg-gray-800 transition-colors"
          >
            Join with Google →
          </button>
        </form>
        <p className="text-sm text-gray-400 mt-4">London + Pune · Free · Builder-first</p>
      </section>

      {/* Featured outcomes */}
      {outcomes && outcomes.length > 0 && (
        <section className="max-w-2xl mx-auto px-6 pb-24">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">
            Recently shipped
          </h2>
          <div className="space-y-3">
            {outcomes.map((outcome) => {
              const m = outcome.matches as any
              const showNames = m?.user1?.allow_feature && m?.user2?.allow_feature
              return (
                <div key={outcome.id} className="border border-gray-100 rounded-2xl p-5 hover:border-gray-300 transition-colors">
                  <p className="font-semibold text-gray-900">{outcome.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{outcome.description}</p>
                  {showNames && (
                    <p className="text-xs text-gray-400 mt-2">
                      {m.user1.name} ({m.user1.role}) × {m.user2.name} ({m.user2.role})
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
