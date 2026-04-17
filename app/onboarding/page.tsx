import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { saveProfile } from '@/lib/actions/profile'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { error } = await searchParams

  return (
    <main className="max-w-lg mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Set up your profile</h1>
      <p className="text-gray-500 mb-8">Tell us what you want to build. Takes 60 seconds.</p>

      {error && (
        <div className="mb-5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error === 'save_failed'
            ? 'Could not save your profile. Please try again.'
            : 'Please fill in all fields correctly.'}
        </div>
      )}

      <form action={saveProfile} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
          <input
            id="name"
            name="name"
            required
            defaultValue={user.user_metadata?.full_name ?? ''}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            id="role"
            name="role"
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">Pick your role</option>
            <option value="AI engineer">AI engineer</option>
            <option value="Founder">Founder</option>
            <option value="Content creator">Content creator</option>
            <option value="Student">Student</option>
          </select>
        </div>

        <div>
          <label htmlFor="goals" className="block text-sm font-medium text-gray-700 mb-1">
            What do you want to ship?
          </label>
          <textarea
            id="goals"
            name="goals"
            required
            rows={3}
            placeholder="e.g. A Chrome extension that summarises LinkedIn posts using AI"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
          />
        </div>

        <div>
          <label htmlFor="preferred_time" className="block text-sm font-medium text-gray-700 mb-1">Preferred call time</label>
          <select
            id="preferred_time"
            name="preferred_time"
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="Morning">Morning</option>
            <option value="Afternoon">Afternoon</option>
            <option value="Evening">Evening</option>
          </select>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="allow_feature"
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">
            Allow me to be featured in public collab stories
          </span>
        </label>

        <button
          type="submit"
          className="w-full bg-black text-white py-3 rounded-full font-medium hover:bg-gray-800 transition-colors"
        >
          Join the collab →
        </button>
      </form>
    </main>
  )
}
