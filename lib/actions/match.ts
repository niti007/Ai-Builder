'use server'
import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const anthropic = new Anthropic()
const resend = new Resend(process.env.RESEND_API_KEY)

export async function createMatch(formData: FormData) {
  // Admin-only guard
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Unauthorized')
  }

  const user1_id = formData.get('user1_id') as string | null
  const user2_id = formData.get('user2_id') as string | null
  const topic = (formData.get('topic') as string | null)?.trim()
  const scheduled_time = formData.get('scheduled_time') as string | null

  // Validate inputs
  if (!user1_id || !user2_id || !topic || !scheduled_time) {
    throw new Error('Missing required fields')
  }
  if (user1_id === user2_id) {
    throw new Error('Cannot match a user with themselves')
  }

  // Fetch both user profiles
  const { data: users, error: usersError } = await supabaseAdmin
    .from('users')
    .select('id, name, role, goals, email')
    .in('id', [user1_id, user2_id])

  if (usersError || !users || users.length < 2) {
    throw new Error('Could not fetch user profiles')
  }

  const u1 = users.find(u => u.id === user1_id)
  const u2 = users.find(u => u.id === user2_id)
  if (!u1 || !u2) throw new Error('Users not found')

  // Insert match row
  const { data: match, error: matchError } = await supabaseAdmin
    .from('matches')
    .insert({ user1_id, user2_id, topic, scheduled_time, status: 'pending' })
    .select('id')
    .single()

  if (matchError || !match) throw matchError ?? new Error('Failed to create match')

  // Generate LLM intro via Claude Haiku (fast + cheap)
  let intro_text = ''
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `You are a collab matchmaker. Write a 2-3 sentence intro explaining why these two builders are a great match and what they could build together. Be specific, energetic, and focused on the output they could create.

User 1: ${u1.name}, ${u1.role}, wants to ship: ${u1.goals}
User 2: ${u2.name}, ${u2.role}, wants to ship: ${u2.goals}`,
        },
      ],
    })
    intro_text = message.content[0].type === 'text' ? message.content[0].text : ''
  } catch (llmError) {
    console.error('[createMatch] LLM intro generation failed:', llmError)
    // Non-fatal: match is still created without an intro
  }

  // Update match with intro text
  if (intro_text) {
    await supabaseAdmin
      .from('matches')
      .update({ intro_text })
      .eq('id', match.id)
  }

  // Send notification emails
  const matchUrl = `${process.env.NEXT_PUBLIC_APP_URL}/match/${match.id}`
  const from = 'AI Builder Collab <onboarding@resend.dev>'

  const emailHtml = (recipientName: string, partnerName: string, partnerRole: string) => `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
      <h2 style="font-size:22px;font-weight:700;color:#111;margin-bottom:8px;">
        You&apos;ve been matched with ${partnerName} 🤝
      </h2>
      <p style="color:#555;margin-bottom:16px;">Hi ${recipientName},</p>
      <p style="color:#555;margin-bottom:8px;">
        You&apos;ve been matched with <strong>${partnerName}</strong> (${partnerRole}) for a micro-collab on:
      </p>
      <blockquote style="border-left:3px solid #000;padding-left:12px;margin:16px 0;color:#333;font-style:italic;">
        ${topic}
      </blockquote>
      ${intro_text ? `<p style="color:#444;margin-bottom:24px;">${intro_text}</p>` : ''}
      <a href="${matchUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:600;font-size:15px;">
        View your match →
      </a>
      <p style="color:#aaa;font-size:12px;margin-top:32px;">AI Builder Collab · London + Pune</p>
    </div>
  `

  try {
    await Promise.all([
      resend.emails.send({
        from,
        to: u1.email,
        subject: `You've been matched with ${u2.name} 🤝`,
        html: emailHtml(u1.name ?? 'there', u2.name ?? 'your partner', u2.role ?? ''),
      }),
      resend.emails.send({
        from,
        to: u2.email,
        subject: `You've been matched with ${u1.name} 🤝`,
        html: emailHtml(u2.name ?? 'there', u1.name ?? 'your partner', u1.role ?? ''),
      }),
    ])
  } catch (emailError) {
    console.error('[createMatch] email send failed:', emailError)
    // Non-fatal: match + intro are already saved
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
}
