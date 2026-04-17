'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function saveProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { error } = await supabase
    .from('users')
    .upsert(
      {
        email: user.email!,
        name: formData.get('name') as string,
        role: formData.get('role') as string,
        goals: formData.get('goals') as string,
        preferred_time: formData.get('preferred_time') as string,
        allow_feature: formData.get('allow_feature') === 'on',
        onboarded: true,
      },
      { onConflict: 'email' }
    )

  if (error) throw error
  redirect('/dashboard')
}
