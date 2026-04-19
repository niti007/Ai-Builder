'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function sendConnectionRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/')

  const { data: me } = await supabase
    .from('users').select('id').eq('email', user.email).single()
  if (!me) redirect('/')

  const to_user_id = formData.get('to_user_id') as string
  const message = (formData.get('message') as string | null)?.trim().slice(0, 300)

  if (!to_user_id || !message) return { error: 'invalid' }

  // check no existing request either direction
  const { data: existing } = await supabase
    .from('connection_requests')
    .select('id')
    .or(
      `and(from_user_id.eq.${me.id},to_user_id.eq.${to_user_id}),and(from_user_id.eq.${to_user_id},to_user_id.eq.${me.id})`
    )
    .maybeSingle()

  if (existing) return { error: 'already_exists' }

  const { error } = await supabase
    .from('connection_requests')
    .insert({ from_user_id: me.id, to_user_id, message })

  if (error) return { error: 'db_error' }

  revalidatePath('/builders')
  revalidatePath('/dashboard')
}

export async function acceptConnectionRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/')

  const { data: me } = await supabase
    .from('users').select('id').eq('email', user.email).single()
  if (!me) redirect('/')

  const request_id = formData.get('request_id') as string

  const { data: req } = await supabase
    .from('connection_requests')
    .select('id, from_user_id, to_user_id, message')
    .eq('id', request_id)
    .eq('to_user_id', me.id)
    .eq('status', 'pending')
    .single()

  if (!req) return { error: 'not_found' }

  await supabase
    .from('connection_requests')
    .update({ status: 'accepted' })
    .eq('id', request_id)

  await supabase.from('matches').insert({
    user1_id: req.from_user_id,
    user2_id: req.to_user_id,
    topic: req.message.slice(0, 120),
    status: 'pending',
    user1_notified: false,
    user2_notified: false,
  })

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function declineConnectionRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/')

  const { data: me } = await supabase
    .from('users').select('id').eq('email', user.email).single()
  if (!me) redirect('/')

  const request_id = formData.get('request_id') as string

  await supabase
    .from('connection_requests')
    .update({ status: 'declined' })
    .eq('id', request_id)
    .eq('to_user_id', me.id)

  revalidatePath('/dashboard')
}
