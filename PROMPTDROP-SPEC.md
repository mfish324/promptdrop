# PromptDrop.co — Build Specification

## Project Overview

Build a web application called PromptDrop — a community platform where users share AI prompts and support creators via donations. Think "Stack Overflow meets Buy Me A Coffee for AI prompts."

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Auth:** Supabase Auth (Google OAuth)
- **Database:** Supabase Postgres
- **Styling:** Tailwind CSS
- **Hosting:** Vercel
- **Payments:** External links only (Ko-fi, PayPal.me) — no payment processing

## Database Schema

### Users
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | primary key, auto-generated |
| email | string | unique |
| username | string | unique, displayed publicly |
| avatar_url | string | optional |
| donation_link | string | Ko-fi, PayPal.me, etc. |
| created_at | timestamp | |

### Prompts
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | primary key |
| user_id | uuid | foreign key → Users |
| title | string | max 100 chars |
| description | text | what it does, when to use it |
| prompt_text | text | the actual prompt |
| category | string | coding, writing, analysis, creative, business, other |
| ai_models | text[] | array: claude, gpt4, gemini, llama, other |
| upvotes | integer | default 0 |
| created_at | timestamp | |

### Votes
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | primary key |
| user_id | uuid | foreign key → Users |
| prompt_id | uuid | foreign key → Prompts |
| created_at | timestamp | |
| | | unique constraint on (user_id, prompt_id) |

## Core Features (MVP)

### Pages

1. **Homepage (`/`)**
   - Header: Logo, Search bar, Submit button, Login/Profile
   - Category filter tabs: All, Coding, Writing, Analysis, Creative, Business, Other
   - Prompt cards sorted by upvotes (default) or recent
   - Each card shows: upvote count, title, author username, AI model tags, truncated description

2. **Prompt Detail (`/prompt/[id]`)**
   - Full prompt display with copy-to-clipboard button
   - Upvote button (requires login)
   - Author info with link to their donation page
   - AI model compatibility tags
   - Category tag

3. **Submit Prompt (`/submit`)** — requires auth
   - Form: title, description, prompt_text, category (dropdown), ai_models (multi-select)
   - Preview before submit

4. **User Profile (`/user/[username]`)**
   - User's submitted prompts
   - Total upvotes received
   - Donation link (prominent)

5. **Auth**
   - Google OAuth via Supabase
   - On first login, prompt for username and optional donation link

### Functionality

- **Upvoting:** One vote per user per prompt. Toggle on/off. Update count in real-time.
- **Copy button:** One-click copy prompt text to clipboard with "Copied!" feedback
- **Search:** Full-text search on title and description
- **Category filter:** Filter prompts by category

## Data Seeding

Seed the database with prompts from the Hugging Face dataset:
- Source: `fka/awesome-chatgpt-prompts` (CC0 license, public domain)
- ~1,100 prompts available
- Map `act` → `title`, `prompt` → `prompt_text`
- Set `user_id` to a system account called "PromptDrop Curated"
- Set `ai_models` to `["claude", "gpt4", "gemini"]` as default
- Use AI or manual tagging to assign categories
- Generate short descriptions from the prompt content

Create an import script (`scripts/seed-prompts.ts`) that:
1. Fetches data from Hugging Face API or local CSV
2. Transforms to our schema
3. Inserts into Supabase

## UI/UX Guidelines

- Clean, minimal design — not cluttered
- Dark mode support (optional for MVP, but set up Tailwind for it)
- Mobile responsive
- Fast — use Next.js server components where possible
- Prompt text display: monospace font, subtle background, good contrast

## File Structure (suggested)
```
/app
  /page.tsx                 # Homepage
  /prompt/[id]/page.tsx     # Prompt detail
  /submit/page.tsx          # Submit form
  /user/[username]/page.tsx # User profile
  /auth/callback/route.ts   # Supabase auth callback
/components
  /PromptCard.tsx
  /UpvoteButton.tsx
  /CopyButton.tsx
  /CategoryTabs.tsx
  /SearchBar.tsx
  /Header.tsx
/lib
  /supabase.ts              # Supabase client
  /types.ts                 # TypeScript types
/scripts
  /seed-prompts.ts          # Data seeding script
```

## Environment Variables Needed
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # for seeding script only
```

## Build Order

1. Set up Next.js project with Tailwind
2. Set up Supabase project and create tables
3. Implement auth (Google OAuth)
4. Build homepage with static prompt cards
5. Connect to Supabase, fetch real prompts
6. Build prompt detail page
7. Implement upvoting
8. Build submit form
9. Build user profile page
10. Write and run seed script
11. Deploy to Vercel

## Out of Scope for MVP

- Comments/discussion
- Prompt versioning/forking
- Collections/folders
- Analytics dashboard
- Email notifications
- Rate limiting (add later)
