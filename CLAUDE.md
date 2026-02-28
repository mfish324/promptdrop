# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PromptDrop is a community platform where users share AI prompts and support creators via donations. Built with Next.js 14 (App Router), Supabase (Auth + Postgres), and Tailwind CSS.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server

# Seed database with prompts from Hugging Face
npx tsx scripts/seed-prompts.ts
```

## Architecture

### Database Schema (Supabase)
- **users** - Profile data (linked to auth.users via id)
- **prompts** - User-submitted prompts with title, description, prompt_text, category, ai_models array
- **votes** - Upvotes (unique per user/prompt pair, triggers update upvote count)

Schema SQL is in `supabase/schema.sql`. Includes RLS policies and a trigger to auto-update prompt upvote counts.

### Key Directories
- `src/app/` - Next.js App Router pages
  - `src/app/prompt/[id]/` - Individual prompt detail page
  - `src/app/user/[username]/` - User profile page
  - `src/app/submit/` - Prompt submission page (requires auth)
  - `src/app/complete-profile/` - New user profile setup
  - `src/app/auth/callback/` - OAuth callback route
  - `src/app/auth/auth-code-error/` - Auth error page
- `src/components/` - React components (PromptCard, UpvoteButton, CopyButton, CategoryTabs, SearchBar, Header)
- `src/lib/supabase/` - Supabase clients (client.ts for browser, server.ts for server components, middleware.ts for session refresh)
- `src/lib/types.ts` - TypeScript types and constants (Category, AIModel, etc.)
- `src/middleware.ts` - Next.js middleware for Supabase session refresh
- `scripts/` - Database seeding script

### Auth Flow
1. Google OAuth via Supabase (`/auth/callback` handles code exchange)
2. New users redirected to `/complete-profile` to set username and optional donation link
3. Middleware refreshes session on each request

### Data Fetching Patterns
- Server components use `createClient()` from `@/lib/supabase/server`
- Client components use `createClient()` from `@/lib/supabase/client`
- Pages with database queries use `export const dynamic = 'force-dynamic'`

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # Only for seed script
```

## Categories

Valid categories: `coding`, `writing`, `analysis`, `creative`, `business`, `other`

## AI Models

Valid model tags: `claude`, `gpt4`, `gemini`, `llama`, `other`
