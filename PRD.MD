# Product Requirements Document – AI‑Builder Collab

## 1. Product overview

**Product name:** AI‑Builder Collab (you can rename to `Mug‑Up`, `Micro‑Mug`, etc.)

**Vision:**  
A lightweight platform that matches AI engineers, founders, and content creators for 1–2‑week **micro‑collabs** (tiny tools, Chrome extensions, content series, or experiments).

**Differentiation vs CoffeeMug.ai**  
- CoffeeMug.ai: CXO‑focused, investor‑style intros, global, meeting‑first [web:22][web:26].  
- This product: **builder‑first, collab‑first, London‑focused + Pune‑interested, outcome‑oriented**.

---

## 2. Purpose & goals

### 2.1 Why we’re building this

- Early‑stage AI builders struggle to find **real partners** who can ship something small with them quickly.  
- Existing tools (meetups, LinkedIn, CoffeeMug.ai) are either too broad or too senior‑focused.

### 2.2 Business & product goals

- **Short‑term**  
  - Ship a working MVP with Next.js + Supabase.  
  - Get 10–20 users and 5–10 collabs started in London/Pune.  
- **Mid‑term**  
  - Turn this into a **brand + content layer** around “AI‑builder collabs.”  
  - Grow a closed‑loop community you can monetize later (premium matching, coaching, workshops).

### 2.3 Key metrics

- **North Star:**  
  - Number of **shipped micro‑collabs** (pairs that clearly completed a small project together).
- **Leading metrics:**  
  - Sign‑ups per week.  
  - Matches created per week.  
  - Match‑acceptance rate (users who click into their match page).  
  - % of matches that submit an “outcome” (1‑line description of what they shipped).

---

## 3. Target users

### 3.1 Primary personas

- **London AI engineer / data person**  
  - Wants to build a Chrome extension, API tool, or automation helper.  
  - Wants feedback on a side‑project.  
- **Pune‑based aspiring founder**  
  - Wants help with a prototype or no‑code/low‑code MVP.  
  - Wants a technical co‑builder.  
- **AI‑content creator (you + similar)**  
  - Wants people to co‑build a small SaaS or tool to talk about on LinkedIn/YouTube/Instagram.

### 3.2 Example user journeys

- **London builder:**  
  - Reads a post from you → signs up → fills out profile → gets matched once per week → joins a 15–20 min call → builds a tiny tool within 2–3 weeks.
- **Pune founder:**  
  - Finds you via X/LinkedIn → joins → gets matched with a London engineer → they ship a simple MVP → you feature the story.

---

## 4. Scope

### 4.1 MVP (Phase 1) – “Tonight + 1 week”

#### Core flows

- User signup (email + profile: name, role, “what I want to ship,” preferred time).  
- Admin‑only matching: you manually pick 2 users and schedule a 15–20 min call (time + topic only).  
- Match view for each user: who you’re matched with, what you can build together, suggested questions.  
- Outcome wall: list of micro‑collabs that shipped something (1‑line title + description).

#### Tech stack

- Next.js 14 (App Router).  
- Supabase (auth + `users`, `matches`, `outcomes` tables).  
- Tailwind CSS (minimal UI, one‑page‑style where possible).  
- Optional: one LLM API call for “AI‑generated intro messages.”

#### Out of scope (MVP)

- Automated AI‑based matching engine.  
- Calendar integration (no Calendly‑style widget).  
- Payment or paid tiers (always‑free until demand is validated).  
- Native mobile app (web‑only MVP).

---

## 5. Core features

### 5.1 User‑facing features

#### 5.1.1 Profile onboarding

- Page: `/onboarding` or `/signup`.  
- Fields:  
  - Name, email.  
  - Role (e.g., “AI engineer,” “founder,” “content creator,” “student”).  
  - “What I want to ship” (free‑text, short).  
  - Preferred time (Morning/Afternoon/EvenJonign).  
  - Checkbox: “Allow me to be featured in public collab stories.”

#### 5.1.2 “Your Match” page

- Route: `/match/[id]` (slug can be UUID).  
- Content:  
  - Matched partner’s name and role.  
  - “Topic you’re matched on” (1–2 sentences).  
  - Suggested questions (static or LLM‑generated).  
  - Suggested call duration & time.  
- Optional:  
  - “Mark this collab as started / completed” button.  
  - Small text field: “Describe what you shipped.”

#### 5.1.3 Outcome wall

- Page: `/collabs` (public or semi‑public).  
- List of micro‑collabs with:  
  - Title (e.g., “AI‑powered LinkedIn‑scraping Chrome extension”).  
  - Two matched users (names or roles).  
  - 1‑sentence outcome.  
  - Share button to LinkedIn/X.

---

### 5.2 Admin features

#### 5.2.1 Admin panel

- Route: `/admin`.  
- Access:  
  - Only logged‑in users with a **whitelist email** (e.g., `your‑email@example.com`).  
- Main view:  
  - List of all users (name, role, email, goals, preferred time, created_at).  
  - Filters: “Unmatched,” “Matched,” “Completed.”

#### 5.2.2 Manual match creation

- Button: “Create Match.”  
- Modal:  
  - Dropdown “User 1,” “User 2.”  
  - Text field: “Collab goal.”  
  - Date/time picker: “scheduled call.”  
- Action:  
  - Create a record in `matches` table.  
  - Optionally send a notification (email or in‑app message) to both users.

#### 5.2.3 Outcome tracking

- On admin page:  
  - List of matches by status (“pending”, “completed”, “skipped”).  
  - For completed matches: show the outcome text and a link to the public collab story.  
- Allow you to **feature** certain outcomes on the homepage or `/collabs` wall.

---

## 6. Data model (simplified)

Use Supabase:

### `users`

- `id` (UUID, primary key)  
- `email` (text, unique)  
- `name` (text)  
- `role` (text)  
- `goals` (text)  
- `preferred_time` (text)  
- `created_at` (timestamp)

### `matches`

- `id` (UUID)  
- `user1_id` (UUID, fk → `users.id`)  
- `user2_id` (UUID, fk → `users.id`)  
- `topic` (text)  
- `scheduled_time` (timestamp)  
- `status` (text: “pending”, “completed”, “skipped”)  
- `created_at` (timestamp)

### `outcomes`

- `id` (UUID)  
- `match_id` (UUID, fk → `matches.id`)  
- `title` (text)  
- `description` (text)  
- `created_at` (timestamp)

---

## 7. UX / UX priorities

- **Onboarding:**  
  - Form under 10 fields; keep it minimal.  
- **Match page:**  
  - Focus on “what you will talk about” and “what you can ship together.”  
- **Admin panel:**  
  - Sorted tables, simple filters, clear “Create Match” flow.  
  - Use a basic Tailwind table UI so you can manage 50+ users.

---

## 8. Success metrics

- **North Star:**  
  - % of matches that end in a **shipped micro‑collab**.  
- **Leading metrics:**  
  - Weekly sign‑ups.  
  - Matches created per week.  
  - Match‑acceptance rate.  
  - Collab‑story submissions (1‑line outcomes).

---

## 9. Risks & assumptions

### Key assumptions

- Builders care more about **shipping with someone** than about “networking.”  
- You can manually match 5–10 pairs per week while growing the brand.  
- People tolerate a simple web app without a scheduler or calendar integration.

### Risks

- If you can’t manually curate matches, the value drops.  
- If collabs don’t ship anything, the outcome wall feels empty.  
- If you don’t pair it with your content (LinkedIn/X/Instagram), awareness will be low.

---

## 10. Release plan

- **Tonight (Week 0)**  
  - Scaffold: Next.js + Supabase + auth + basic profile form.  
- **Week 1**  
  - Finish `/match` page and admin panel.  
  - Add outcome tracking.  
  - Activate first 10–20 users (friends, community contacts).  
- **Week 2+**  
  - Iterate on UI, add simple AI‑generated intros.  
  - Start posting collab stories on LinkedIn/X/Instagram.  
  - Look at metrics and decide whether to invest more or pivot.