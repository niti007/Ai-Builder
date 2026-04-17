'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function submitOutcome(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const match_id = formData.get('match_id') as string | null
  const title = (formData.get('title') as string | null)?.trim()
  const description = (formData.get('description') as string | null)?.trim()

  if (!match_id || !title) redirect('/')

  const { error } = await supabase
    .from('outcomes')
    .insert({ match_id, title, description: description ?? '' })

  if (error) throw error

  await supabase
    .from('matches')
    .update({ status: 'completed' })
    .eq('id', match_id)

  revalidatePath(`/match/${match_id}`)
  revalidatePath('/collabs')
  revalidatePath('/')
}
