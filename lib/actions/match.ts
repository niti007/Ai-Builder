'use server'
import 'server-only'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY)

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export async function createMatch(formData: FormData): Promise<void> {
  // Admin-only guard
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Unauthorized')
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is not configured')

  const user1_id = formData.get('user1_id') as string | null
  const user2_id = formData.get('user2_id') as string | null
  const topic = (formData.get('topic') as string | null)?.trim()
  const scheduled_time = formData.get('scheduled_time') as string | null

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

  // Generate LLM intro
  let intro_text = ''
  try {
    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = `You are a collab matchmaker. Write a 2-3 sentence intro explaining why these two builders are a great match and what they could build together. Be specific, energetic, and focused on the output they could create. Respond with plain text only — no HTML, no markdown, no special formatting.

[User 1] Name: ${u1.name} | Role: ${u1.role} | Wants to ship: ${u1.goals}
[User 2] Name: ${u2.name} | Role: ${u2.role} | Wants to ship: ${u2.goals}`

    const result = await model.generateContent(prompt)
    intro_text = result.response.text().trim()
  } catch (llmError) {
    console.error('[createMatch] LLM intro generation failed:', llmError)
  }

  // Update match with intro text
  if (intro_text) {
    const { error: introUpdateError } = await supabaseAdmin
      .from('matches')
      .update({ intro_text })
      .eq('id', match.id)
    if (introUpdateError) {
      console.error('[createMatch] intro_text update failed:', introUpdateError)
    }
  }

  // Send notification emails — HTML-escape all user-controlled values
  const matchUrl = `${appUrl}/match/${match.id}`

  const emailHtml = (recipientName: string, partnerName: string, partnerRole: string) => `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
      <h2 style="font-size:22px;font-weight:700;color:#111;margin-bottom:8px;">
        You've been matched with ${escHtml(partnerName)} 🤝
      </h2>
      <p style="color:#555;margin-bottom:16px;">Hi ${escHtml(recipientName)},</p>
      <p style="color:#555;margin-bottom:8px;">
        You've been matched with <strong>${escHtml(partnerName)}</strong> (${escHtml(partnerRole)}) for a micro-collab on:
      </p>
      <blockquote style="border-left:3px solid #000;padding-left:12px;margin:16px 0;color:#333;font-style:italic;">
        ${escHtml(topic)}
      </blockquote>
      ${intro_text ? `<p style="color:#444;margin-bottom:24px;">${escHtml(intro_text)}</p>` : ''}
      <a href="${matchUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:600;font-size:15px;">
        View your match &rarr;
      </a>
      <p style="color:#aaa;font-size:12px;margin-top:32px;">AI Builder Collab &middot; London + Pune</p>
    </div>
  `

  const [r1, r2] = await Promise.allSettled([
    resend.emails.send({
      from: 'AI Builder Collab <onboarding@resend.dev>',
      to: u1.email,
      subject: `You've been matched with ${u2.name ?? 'a builder'} 🤝`,
      html: emailHtml(u1.name ?? 'there', u2.name ?? 'your partner', u2.role ?? ''),
    }),
    resend.emails.send({
      from: 'AI Builder Collab <onboarding@resend.dev>',
      to: u2.email,
      subject: `You've been matched with ${u1.name ?? 'a builder'} 🤝`,
      html: emailHtml(u2.name ?? 'there', u1.name ?? 'your partner', u1.role ?? ''),
    }),
  ])

  if (r1.status === 'rejected') console.error('[createMatch] email failed for user1:', r1.reason)
  if (r2.status === 'rejected') console.error('[createMatch] email failed for user2:', r2.reason)

  revalidatePath('/admin')
  revalidatePath('/dashboard')
}
