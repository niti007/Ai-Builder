import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { saveProfile } from '@/lib/actions/profile'
import RoleSelect from '@/components/RoleSelect'
import AvatarUpload from '@/components/AvatarUpload'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: existingProfile } = await supabase
    .from('users')
    .select('avatar_url, bio')
    .eq('email', user.email!)
    .maybeSingle()

  const { error } = await searchParams

  return (
    <main className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1a1a1a]">
        <span style={{ fontFamily: 'var(--font-anton)', letterSpacing: '0.06em', fontSize: '18px' }}>BC</span>
      </nav>

      <div className="flex-1 flex flex-col items-center px-6 py-14">
        <div className="w-full max-w-md">
        <div className="text-[10px] text-[#ff2d00] tracking-[0.2em] uppercase mb-4 text-center">
          // Profile setup
        </div>
        <h1
          style={{ fontFamily: 'var(--font-anton)', fontSize: '40px', letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1 }}
          className="mb-2 text-white text-center"
        >
          Set up your<br />profile.
        </h1>
        <p className="text-[13px] text-[#666] mb-10 text-center">Takes 60 seconds.</p>

        {error && (
          <div className="mb-6 text-[11px] px-4 py-3 border border-[#ff2d00]/30 bg-[#ff2d00]/5 text-[#ff6644]">
            {error === 'save_failed'
              ? 'Could not save profile. Please try again.'
              : 'Fill in all fields correctly.'}
          </div>
        )}

        <form action={saveProfile} className="space-y-5">

          {/* Avatar */}
          <div className="flex flex-col items-center pb-2">
            <label className="block text-[10px] text-[#888] tracking-[0.15em] uppercase mb-3">Profile photo</label>
            <AvatarUpload currentUrl={existingProfile?.avatar_url ?? undefined} />
          </div>

          <div>
            <label htmlFor="name" className="block text-[10px] text-[#888] tracking-[0.15em] uppercase mb-2">Your name</label>
            <input id="name" name="name" required defaultValue={user.user_metadata?.full_name ?? ''} className="glass-input" placeholder="e.g. Nitish Galat" />
          </div>

          <div>
            <label className="block text-[10px] text-[#888] tracking-[0.15em] uppercase mb-2">Role</label>
            <RoleSelect />
          </div>

          <div>
            <label htmlFor="goals" className="block text-[10px] text-[#888] tracking-[0.15em] uppercase mb-2">What do you want to ship?</label>
            <textarea
              id="goals" name="goals" required rows={3}
              placeholder="e.g. A Chrome extension that summarises LinkedIn posts using AI"
              className="glass-input resize-none"
            />
          </div>

          <div>
            <label htmlFor="preferred_time" className="block text-[10px] text-[#888] tracking-[0.15em] uppercase mb-2">Preferred call time</label>
            <select id="preferred_time" name="preferred_time" required className="glass-input">
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Evening">Evening</option>
            </select>
          </div>

          <div>
            <label htmlFor="bio" className="block text-[10px] text-[#888] tracking-[0.15em] uppercase mb-2">About you</label>
            <textarea
              id="bio" name="bio" rows={3}
              defaultValue={existingProfile?.bio ?? ''}
              placeholder="e.g. Ex-Figma designer, obsessed with AI tooling. Building in public since 2022."
              className="glass-input resize-none"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <input type="checkbox" name="allow_feature" className="mt-0.5 h-4 w-4" style={{ accentColor: '#ff2d00' }} />
            <span className="text-[12px] text-[#777]">Allow me to be featured in public collab stories</span>
          </label>

          <button type="submit" className="btn-gradient w-full py-4 text-[11px]">
            JOIN_THE_COLLAB →
          </button>
        </form>
        </div>
      </div>
    </main>
  )
}
