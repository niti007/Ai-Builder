# AI-Builder Collab MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web platform that lets an admin manually match AI builders for 1–2 week micro-collabs, with Google auth, a match page with LLM-generated intro, email notifications, and a public outcome wall.

**Architecture:** Next.js 14 App Router with Server Components for all reads and Server Actions for all writes — no separate API routes. Supabase handles auth (Google OAuth) and the database. The `createMatch` Server Action calls Claude API for an intro blurb and Resend for emails, both in one step.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase (`@supabase/ssr`), Anthropic SDK (`@anthropic-ai/sdk`), Resend, Netlify + `@netlify/plugin-nextjs`

---

## File Map

| File | Responsibility |
|---|---|
| `app/page.tsx` | Public splash — value prop, Join CTA, 2–3 featured outcomes |
| `app/layout.tsx` | Root layout — minimal nav |
| `app/auth/callback/route.ts` | Exchange OAuth code for session, redirect to onboarding or dashboard |
| `app/onboarding/page.tsx` | Profile form for first-time users |
| `app/dashboard/page.tsx` | User home — shows match CTA or queue state |
| `app/match/[id]/page.tsx` | Match detail — partner info, LLM intro, outcome submit form |
| `app/collabs/page.tsx` | Public outcome wall |
| `app/admin/page.tsx` | Admin-only: user table + matches table + Create Match button |
| `lib/supabase/server.ts` | `createClient()` — server-side Supabase client |
| `lib/supabase/client.ts` | `createClient()` — browser Supabase client |
| `lib/supabase/admin.ts` | `supabaseAdmin` — service-role client for admin actions |
| `lib/actions/auth.ts` | `signInWithGoogle` Server Action |
| `lib/actions/profile.ts` | `saveProfile` Server Action |
| `lib/actions/match.ts` | `createMatch` Server Action (LLM + email) |
| `lib/actions/outcome.ts` | `submitOutcome` Server Action |
| `components/CreateMatchModal.tsx` | Client component — modal form for admin match creation |
| `middleware.ts` | Route protection + first-login redirect |
| `netlify.toml` | Netlify build config + plugin |
| `.env.local` | All secrets (see Task 1) |

---

## Task 1: Scaffold the project

**Files:**
- Create: `netlify.toml`
- Create: `.env.local`
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Scaffold Next.js app in workspace**

```bash
cd C:/Users/nitis/workspace
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --yes
```

Expected: Next.js project created with `app/`, `public/`, `tailwind.config.ts`, `tsconfig.json`.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/ssr @supabase/supabase-js @anthropic-ai/sdk resend
npm install -D @netlify/plugin-nextjs
```

Expected: `node_modules` populated, no peer-dep errors.

- [ ] **Step 3: Create netlify.toml**

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

- [ ] **Step 4: Create .env.local with placeholder values**

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
RESEND_API_KEY=your-resend-key
ADMIN_EMAIL=your-email@example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

- [ ] **Step 5: Remove boilerplate from app/page.tsx**

Replace `app/page.tsx` with:

```tsx
export default function Home() {
  return <main><h1>AI Builder Collab</h1></main>
}
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: Server starts at http://localhost:3000 with no errors.

- [ ] **Step 7: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js + Netlify + Supabase deps"
```

---

## Task 2: Supabase project setup + database schema

**Files:**
- No code files — Supabase dashboard + SQL

- [ ] **Step 1: Create Supabase project**

Go to https://supabase.com → New project → note your Project URL and anon key → update `.env.local` with real values.

- [ ] **Step 2: Enable Google OAuth in Supabase**

In Supabase dashboard → Authentication → Providers → Google → enable → add your Google OAuth Client ID and Secret (from https://console.cloud.google.com → APIs & Services → Credentials).

Add `http://localhost:3000/auth/callback` to the authorized redirect URIs in Google Cloud Console.

- [ ] **Step 3: Run SQL migration in Supabase SQL editor**

```sql
-- Users table
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  role text,
  goals text,
  preferred_time text,
  allow_feature boolean default false,
  onboarded boolean default false,
  created_at timestamptz default now()
);

-- Matches table
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid references public.users(id),
  user2_id uuid references public.users(id),
  topic text,
  intro_text text,
  scheduled_time timestamptz,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Outcomes table
create table public.outcomes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id),
  title text,
  description text,
  featured boolean default false,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.users enable row level security;
alter table public.matches enable row level security;
alter table public.outcomes enable row level security;

-- Policies: public read for outcomes and matches (for collabs wall)
create policy "Anyone can read outcomes" on public.outcomes for select using (true);
create policy "Anyone can read matches" on public.matches for select using (true);
create policy "Users can read all users" on public.users for select using (true);

-- Users can upsert their own profile
create policy "Users can upsert own profile" on public.users
  for insert with check (auth.jwt() ->> 'email' = email);
create policy "Users can update own profile" on public.users
  for update using (auth.jwt() ->> 'email' = email);

-- Users can insert outcomes for their own matches
create policy "Users can insert outcomes" on public.outcomes for insert with check (true);
create policy "Users can update match status" on public.matches for update using (true);
```

- [ ] **Step 4: Get service role key**

In Supabase → Settings → API → copy `service_role` key → update `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

---

## Task 3: Supabase helpers + middleware + auth callback

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/admin.ts`
- Create: `middleware.ts`
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Create lib/supabase/server.ts**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 2: Create lib/supabase/client.ts**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Create lib/supabase/admin.ts**

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

- [ ] **Step 4: Create middleware.ts**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const protectedPaths = ['/dashboard', '/onboarding', '/match', '/admin']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth).*)'],
}
```

- [ ] **Step 5: Create app/auth/callback/route.ts**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('onboarded')
        .eq('email', user.email)
        .single()

      if (!profile?.onboarded) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/`)
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 7: Commit**

```bash
git add lib/ middleware.ts app/auth/
git commit -m "feat: add Supabase helpers, middleware, and auth callback"
```

---

## Task 4: Auth action + splash page

**Files:**
- Create: `lib/actions/auth.ts`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create lib/actions/auth.ts**

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function signInWithGoogle() {
  const supabase = createClient()
  const origin = headers().get('origin')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) throw error
  if (data.url) redirect(data.url)
}
```

- [ ] **Step 2: Update app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Builder Collab',
  description: '1–2 week micro-collabs for AI engineers, founders, and creators.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Update app/page.tsx — splash with featured outcomes**

```tsx
import { createClient } from '@/lib/supabase/server'
import { signInWithGoogle } from '@/lib/actions/auth'

export default async function SplashPage() {
  const supabase = createClient()

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
```

- [ ] **Step 4: Start dev server and verify splash renders**

```bash
npm run dev
```

Open http://localhost:3000 — expect: hero text, "Join with Google →" button, no errors in terminal.

- [ ] **Step 5: Commit**

```bash
git add app/ lib/actions/auth.ts
git commit -m "feat: splash page with Google OAuth action"
```

---

## Task 5: Onboarding page + saveProfile action

**Files:**
- Create: `app/onboarding/page.tsx`
- Create: `lib/actions/profile.ts`

- [ ] **Step 1: Create lib/actions/profile.ts**

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function saveProfile(formData: FormData) {
  const supabase = createClient()
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
```

- [ ] **Step 2: Create app/onboarding/page.tsx**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { saveProfile } from '@/lib/actions/profile'

export default async function OnboardingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  return (
    <main className="max-w-lg mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Set up your profile</h1>
      <p className="text-gray-500 mb-8">Tell us what you want to build. Takes 60 seconds.</p>

      <form action={saveProfile} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
          <input
            name="name"
            required
            defaultValue={user.user_metadata?.full_name ?? ''}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            name="role"
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">Pick your role</option>
            <option>AI engineer</option>
            <option>Founder</option>
            <option>Content creator</option>
            <option>Student</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What do you want to ship?
          </label>
          <textarea
            name="goals"
            required
            rows={3}
            placeholder="e.g. A Chrome extension that summarises LinkedIn posts using AI"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred call time</label>
          <select
            name="preferred_time"
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Evening</option>
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
```

- [ ] **Step 3: Test onboarding flow manually**

1. Click "Join with Google →" on splash
2. Complete Google OAuth
3. Expect redirect to `/onboarding`
4. Fill form and submit
5. Expect redirect to `/dashboard` (will be empty for now)
6. Check Supabase → Table Editor → `users` table — row should exist with `onboarded: true`

- [ ] **Step 4: Commit**

```bash
git add app/onboarding/ lib/actions/profile.ts
git commit -m "feat: onboarding form and saveProfile action"
```

---

## Task 6: Dashboard page

**Files:**
- Create: `app/dashboard/page.tsx`

- [ ] **Step 1: Create app/dashboard/page.tsx**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, onboarded')
    .eq('email', user.email!)
    .single()

  if (!profile?.onboarded) redirect('/onboarding')

  const { data: match } = await supabase
    .from('matches')
    .select('id, topic, scheduled_time, status')
    .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <main className="max-w-lg mx-auto px-6 py-16">
      <p className="text-sm text-gray-400 mb-1">Hey, {profile.name}</p>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your collab hub</h1>

      {match ? (
        <div className="border border-gray-200 rounded-2xl p-6">
          <span className="inline-block text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded mb-3">
            New match
          </span>
          <p className="font-semibold text-gray-900 mb-1">{match.topic}</p>
          {match.scheduled_time && (
            <p className="text-sm text-gray-500 mb-4">
              Suggested call: {new Date(match.scheduled_time).toLocaleDateString('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          )}
          <Link
            href={`/match/${match.id}`}
            className="inline-block bg-black text-white px-6 py-2.5 rounded-full font-medium hover:bg-gray-800 transition-colors"
          >
            View your match →
          </Link>
        </div>
      ) : (
        <div className="border border-gray-100 rounded-2xl p-6 bg-gray-50">
          <p className="font-semibold text-gray-700 mb-1">You're in the queue</p>
          <p className="text-sm text-gray-500">
            We'll email you when we find your collab partner. Check back soon!
          </p>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gray-100">
        <Link href="/collabs" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          Browse shipped collabs →
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify dashboard shows queue state**

Navigate to `/dashboard` — should show "You're in the queue" (no matches exist yet).

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/
git commit -m "feat: dashboard page with match CTA or queue state"
```

---

## Task 7: Match page + submitOutcome action

**Files:**
- Create: `app/match/[id]/page.tsx`
- Create: `lib/actions/outcome.ts`

- [ ] **Step 1: Create lib/actions/outcome.ts**

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function submitOutcome(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const match_id = formData.get('match_id') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string

  const { error } = await supabase
    .from('outcomes')
    .insert({ match_id, title, description })

  if (error) throw error

  await supabase
    .from('matches')
    .update({ status: 'completed' })
    .eq('id', match_id)

  revalidatePath(`/match/${match_id}`)
  revalidatePath('/collabs')
  revalidatePath('/')
}
```

- [ ] **Step 2: Create app/match/[id]/page.tsx**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { submitOutcome } from '@/lib/actions/outcome'
import Link from 'next/link'

export default async function MatchPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('email', user.email!)
    .single()

  if (!profile) redirect('/onboarding')

  const { data: match } = await supabase
    .from('matches')
    .select(`
      id, topic, intro_text, scheduled_time, status,
      user1:users!user1_id(id, name, role, goals),
      user2:users!user2_id(id, name, role, goals),
      outcomes(id, title, description)
    `)
    .eq('id', params.id)
    .single()

  if (!match) notFound()

  const isUser1 = (match.user1 as any).id === profile.id
  const isUser2 = (match.user2 as any).id === profile.id
  if (!isUser1 && !isUser2) notFound()

  const partner = (isUser1 ? match.user2 : match.user1) as any
  const outcomes = match.outcomes as any[]
  const hasOutcome = outcomes && outcomes.length > 0

  return (
    <main className="max-w-lg mx-auto px-6 py-16">
      <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-700 mb-6 inline-block">
        ← Dashboard
      </Link>

      <span className="inline-block text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded mb-3">
        Your collab match
      </span>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{match.topic}</h1>

      {/* Partner card */}
      <div className="border border-gray-200 rounded-2xl p-5 mb-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Your partner</p>
        <p className="font-semibold text-gray-900">{partner.name}</p>
        <p className="text-sm text-gray-500 mb-2">{partner.role}</p>
        <p className="text-sm text-gray-700">{partner.goals}</p>
      </div>

      {/* LLM intro */}
      {match.intro_text && (
        <div className="bg-gray-50 rounded-2xl p-5 mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Why you're a match</p>
          <p className="text-gray-700 text-sm leading-relaxed">{match.intro_text}</p>
        </div>
      )}

      {/* Suggested call time */}
      {match.scheduled_time && (
        <p className="text-sm text-gray-500 mb-6">
          Suggested call:{' '}
          <strong>
            {new Date(match.scheduled_time).toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
            })}
          </strong>
        </p>
      )}

      {/* Outcome submit or done state */}
      {hasOutcome ? (
        <div className="border border-green-200 bg-green-50 rounded-2xl p-5">
          <p className="font-semibold text-green-700 mb-1">Shipped! 🎉</p>
          <p className="text-sm text-green-600">{outcomes[0].title}</p>
          <p className="text-xs text-green-500 mt-1">{outcomes[0].description}</p>
        </div>
      ) : (
        <form action={submitOutcome} className="space-y-3 border border-gray-200 rounded-2xl p-5">
          <p className="text-sm font-medium text-gray-700 mb-1">Did you ship something?</p>
          <input type="hidden" name="match_id" value={match.id} />
          <input
            name="title"
            placeholder="What did you build? (e.g. AI LinkedIn Chrome extension)"
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <textarea
            name="description"
            placeholder="One-line description"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
          />
          <button
            type="submit"
            className="w-full bg-black text-white py-3 rounded-full font-medium hover:bg-gray-800 transition-colors"
          >
            Mark as shipped ✓
          </button>
        </form>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/match/ lib/actions/outcome.ts
git commit -m "feat: match page and submitOutcome action"
```

---

## Task 8: Collabs wall

**Files:**
- Create: `app/collabs/page.tsx`

- [ ] **Step 1: Create app/collabs/page.tsx**

```tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function CollabsPage() {
  const supabase = createClient()

  const { data: outcomes } = await supabase
    .from('outcomes')
    .select(`
      id, title, description, featured, created_at,
      matches (
        user1:users!user1_id(name, role, allow_feature),
        user2:users!user2_id(name, role, allow_feature)
      )
    `)
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-700 mb-8 inline-block">
        ← Home
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Shipped collabs</h1>
      <p className="text-gray-500 mb-10">Real things built by real pairs of builders.</p>

      <div className="space-y-4">
        {outcomes?.map((outcome) => {
          const m = outcome.matches as any
          const showNames = m?.user1?.allow_feature && m?.user2?.allow_feature

          return (
            <div
              key={outcome.id}
              className={`rounded-2xl p-5 border transition-colors ${
                outcome.featured
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              {outcome.featured && (
                <span className="inline-block text-xs font-semibold bg-black text-white px-2 py-0.5 rounded mb-2">
                  Featured
                </span>
              )}
              <h3 className="font-semibold text-gray-900">{outcome.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{outcome.description}</p>
              <p className="text-xs text-gray-400 mt-3">
                {showNames
                  ? `${m.user1.name} (${m.user1.role}) × ${m.user2.name} (${m.user2.role})`
                  : 'Two builders shipped this'}
              </p>
            </div>
          )
        })}

        {(!outcomes || outcomes.length === 0) && (
          <div className="text-center py-16">
            <p className="text-gray-400">First collabs coming soon.</p>
            <Link href="/" className="text-sm text-black underline mt-3 inline-block">
              Be the first to join →
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/collabs/
git commit -m "feat: public collabs outcome wall"
```

---

## Task 9: Admin panel + CreateMatchModal

**Files:**
- Create: `app/admin/page.tsx`
- Create: `components/CreateMatchModal.tsx`

- [ ] **Step 1: Create components/CreateMatchModal.tsx**

```tsx
'use client'
import { useState, useTransition } from 'react'
import { createMatch } from '@/lib/actions/match'

type User = { id: string; name: string; email: string }

export default function CreateMatchModal({ users }: { users: User[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createMatch(formData)
      setOpen(false)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        + Create Match
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Create a collab match</h2>

            <form action={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User 1</label>
                <select
                  name="user1_id"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select a user</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User 2</label>
                <select
                  name="user2_id"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select a user</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Collab goal</label>
                <input
                  name="topic"
                  required
                  placeholder="e.g. Build an AI Chrome extension for LinkedIn"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suggested call time</label>
                <input
                  name="scheduled_time"
                  type="datetime-local"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-black text-white py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {isPending ? 'Creating…' : 'Create + notify both →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Create app/admin/page.tsx**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateMatchModal from '@/components/CreateMatchModal'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/')
  }

  const [{ data: users }, { data: matches }] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, email, role, goals, preferred_time, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('matches')
      .select(`
        id, topic, status, scheduled_time, created_at,
        user1:users!user1_id(name),
        user2:users!user2_id(name),
        outcomes(title)
      `)
      .order('created_at', { ascending: false }),
  ])

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-50 text-yellow-700',
      completed: 'bg-green-50 text-green-700',
      skipped: 'bg-red-50 text-red-600',
    }
    return `px-2 py-0.5 rounded text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600'}`
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
        <CreateMatchModal users={(users ?? []).map(u => ({ id: u.id, name: u.name!, email: u.email }))} />
      </div>

      {/* Users */}
      <section className="mb-12">
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Users <span className="text-gray-400 font-normal">({users?.length ?? 0})</span>
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Role', 'Goals', 'Time', 'Joined'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users?.map(u => (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.role}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    <p className="truncate">{u.goals}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.preferred_time}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Matches */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Matches <span className="text-gray-400 font-normal">({matches?.length ?? 0})</span>
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Pair', 'Topic', 'Status', 'Outcome'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matches?.map(m => (
                <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {(m.user1 as any)?.name} × {(m.user2 as any)?.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    <p className="truncate">{m.topic}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadge(m.status!)}>{m.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {(m.outcomes as any[])?.[0]?.title ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/ components/CreateMatchModal.tsx
git commit -m "feat: admin panel with user/match tables and CreateMatchModal"
```

---

## Task 10: createMatch Server Action (LLM + email)

**Files:**
- Create: `lib/actions/match.ts`

> **Before this task:** Make sure `ANTHROPIC_API_KEY` and `RESEND_API_KEY` are set in `.env.local`. In Resend, verify a sending domain (or use `onboarding@resend.dev` for testing). Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`.

- [ ] **Step 1: Create lib/actions/match.ts**

```typescript
'use server'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const anthropic = new Anthropic()
const resend = new Resend(process.env.RESEND_API_KEY)

export async function createMatch(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Unauthorized')
  }

  const user1_id = formData.get('user1_id') as string
  const user2_id = formData.get('user2_id') as string
  const topic = formData.get('topic') as string
  const scheduled_time = formData.get('scheduled_time') as string

  // Fetch both profiles
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, name, role, goals, email')
    .in('id', [user1_id, user2_id])

  const u1 = users?.find(u => u.id === user1_id)
  const u2 = users?.find(u => u.id === user2_id)
  if (!u1 || !u2) throw new Error('Users not found')

  // Insert match
  const { data: match, error } = await supabaseAdmin
    .from('matches')
    .insert({ user1_id, user2_id, topic, scheduled_time, status: 'pending' })
    .select('id')
    .single()

  if (error || !match) throw error ?? new Error('Failed to create match')

  // Generate LLM intro (Claude Haiku — fast + cheap)
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

  const intro_text =
    message.content[0].type === 'text' ? message.content[0].text : ''

  await supabaseAdmin
    .from('matches')
    .update({ intro_text })
    .eq('id', match.id)

  // Send emails
  const matchUrl = `${process.env.NEXT_PUBLIC_APP_URL}/match/${match.id}`
  const from = 'AI Builder Collab <onboarding@resend.dev>'

  await Promise.all([
    resend.emails.send({
      from,
      to: u1.email,
      subject: `You've been matched with ${u2.name} 🤝`,
      html: `
        <p>Hi ${u1.name},</p>
        <p>You've been matched with <strong>${u2.name}</strong> (${u2.role}) for a collab on:</p>
        <blockquote>${topic}</blockquote>
        <p>${intro_text}</p>
        <p><a href="${matchUrl}">View your match →</a></p>
        <p style="color:#9ca3af;font-size:12px;">AI Builder Collab · London + Pune</p>
      `,
    }),
    resend.emails.send({
      from,
      to: u2.email,
      subject: `You've been matched with ${u1.name} 🤝`,
      html: `
        <p>Hi ${u2.name},</p>
        <p>You've been matched with <strong>${u1.name}</strong> (${u1.role}) for a collab on:</p>
        <blockquote>${topic}</blockquote>
        <p>${intro_text}</p>
        <p><a href="${matchUrl}">View your match →</a></p>
        <p style="color:#9ca3af;font-size:12px;">AI Builder Collab · London + Pune</p>
      `,
    }),
  ])

  revalidatePath('/admin')
  revalidatePath('/dashboard')
}
```

- [ ] **Step 2: End-to-end test via admin panel**

1. Log in as admin email
2. Go to `/admin`
3. Click "Create Match" — pick two test users, add topic, set scheduled time
4. Click "Create + notify both →"
5. Expect: modal closes, match row appears in Matches table
6. Check Supabase → `matches` table: `intro_text` should be populated
7. Check the email inboxes of both users (or Resend dashboard for sent emails)
8. Log out and log in as one of the matched users
9. Go to `/dashboard` — should see match CTA
10. Click → `/match/[id]` should show partner info + LLM intro

- [ ] **Step 3: Commit**

```bash
git add lib/actions/match.ts
git commit -m "feat: createMatch action with Claude intro + Resend email"
```

---

## Task 11: Deploy to Netlify

**Files:**
- Modify: `.env.local` (values only — no code changes)

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/ai-builder-collab.git
git branch -M main
git push -u origin main
```

- [ ] **Step 2: Create Netlify site**

Go to https://app.netlify.com → Add new site → Import from GitHub → select the repo → Netlify auto-detects `netlify.toml`.

- [ ] **Step 3: Set environment variables in Netlify**

Netlify → Site configuration → Environment variables → add all vars from `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
RESEND_API_KEY
ADMIN_EMAIL
NEXT_PUBLIC_APP_URL    ← set to your Netlify URL e.g. https://ai-builder-collab.netlify.app
```

- [ ] **Step 4: Add Netlify callback URL to Supabase + Google Cloud**

In Supabase → Auth → URL Configuration → add:
- Site URL: `https://your-site.netlify.app`
- Redirect URL: `https://your-site.netlify.app/auth/callback`

In Google Cloud Console → OAuth credentials → Authorized redirect URIs → add `https://your-site.netlify.app/auth/callback`

- [ ] **Step 5: Trigger deploy and verify**

Push any small change or manually trigger deploy in Netlify → wait for build to complete → visit production URL.

Run verification checklist:
- [ ] `/` renders splash with "Join with Google →"
- [ ] Google login → redirects to `/onboarding` on first login
- [ ] Onboarding form saves to Supabase and redirects to `/dashboard`
- [ ] Return login → goes to `/dashboard` directly
- [ ] `/dashboard` shows queue state for new users
- [ ] `/admin` redirects non-admin emails to `/`
- [ ] Admin can create a match → both users get email → match appears on `/dashboard`
- [ ] `/match/[id]` shows LLM intro text
- [ ] Outcome submit → appears on `/collabs` and homepage
- [ ] Non-consenting user outcome shows "Two builders shipped this"

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "chore: production-ready"
git push
```

---

## Spec coverage self-check

| PRD requirement | Task |
|---|---|
| Google OAuth signup | Task 3, 4 |
| Profile form (name, role, goals, time, consent) | Task 5 |
| Admin panel with user list | Task 9 |
| Manual match creation modal | Task 9 |
| Match page with partner + topic | Task 7 |
| LLM-generated intro on match page | Task 10 |
| Outcome submission from match page | Task 7 |
| Outcome wall (`/collabs`) public | Task 8 |
| Featured outcomes on homepage | Task 4 |
| Email notification to both users | Task 10 |
| In-app match badge on dashboard | Task 6 |
| Privacy: anonymize if no consent | Task 8 |
| `/admin` whitelist-email protected | Task 9 |
| Netlify deploy | Task 11 |
