'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const VALID_ROLES = ['AI engineer', 'Founder', 'Content creator', 'Student'] as const
const VALID_TIMES = ['Morning', 'Afternoon', 'Evening'] as const

export async function saveProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/')

  const name = (formData.get('name') as string | null)?.trim()
  const role = formData.get('role') as string | null
  const goals = (formData.get('goals') as string | null)?.trim()
  const preferred_time = formData.get('preferred_time') as string | null

  if (
    !name ||
    !role ||
    !goals ||
    !preferred_time ||
    !(VALID_ROLES as readonly string[]).includes(role) ||
    !(VALID_TIMES as readonly string[]).includes(preferred_time)
  ) {
    redirect('/onboarding?error=invalid')
  }

  const { error } = await supabase
    .from('users')
    .upsert(
      {
        email: user.email,
        name,
        role,
        goals,
        preferred_time,
        allow_feature: formData.get('allow_feature') === 'on',
        onboarded: true,
      },
      { onConflict: 'email' }
    )

  if (error) redirect('/onboarding?error=save_failed')
  redirect('/dashboard')
}
