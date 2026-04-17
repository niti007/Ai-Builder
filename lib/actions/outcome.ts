'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function submitOutcome(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/')

  const match_id = formData.get('match_id') as string | null
  const title = (formData.get('title') as string | null)?.trim()
  const description = (formData.get('description') as string | null)?.trim() ?? null

  if (!match_id || !title) redirect('/')

  // Verify the current user is a participant in this match
  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('email', user.email)
    .single()

  if (!profile) redirect('/')

  const { data: memberCheck } = await supabase
    .from('matches')
    .select('id')
    .eq('id', match_id)
    .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
    .maybeSingle()

  if (!memberCheck) redirect('/')

  const { error: outcomeError } = await supabase
    .from('outcomes')
    .insert({ match_id, title, description })

  if (outcomeError) throw outcomeError

  const { error: updateError } = await supabase
    .from('matches')
    .update({ status: 'completed' })
    .eq('id', match_id)

  if (updateError) console.error('[submitOutcome] failed to update match status:', updateError)

  revalidatePath(`/match/${match_id}`)
  revalidatePath('/collabs')
  revalidatePath('/')
}
