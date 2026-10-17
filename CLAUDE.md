# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PromptDrop is a community platform where users share AI prompts and support creators via donations. Built with Next.js 14.2 (App Router), Supabase (Auth + Postgres via @supabase/ssr), and Tailwind CSS 3.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server

# Import prompts/agents from public sources (see Importer below)
npm run import -- --source all [--dry-run]
npx tsx scripts/seed-prompts.ts   # Hugging Face only (legacy wrapper)
```

## Architecture

### Database Schema (Supabase)
- **users** - Profile data (linked to auth.users via id)
- **prompts** - Prompts and agents (`type` = `prompt` | `agent`) with title, description, prompt_text, category, ai_models array. Agent-only: agent_platform, agent_tools, usage_notes. Provenance for imported rows: imported, source_url, source_license, original_author, content_hash (unique, dedupe key)
- **votes** - Upvotes (unique per user/prompt pair, triggers update upvote count)

Schema SQL is in `supabase/schema.sql`; incremental changes for existing databases are in `supabase/migrations/`. RLS only lets users insert/update rows with `imported = false`; importers use the service role. Includes RLS policies and a trigger to auto-update prompt upvote counts.

### Key Directories
- `src/app/` - Next.js App Router pages
  - `src/app/prompt/[id]/` - Individual prompt detail page
  - `src/app/user/[username]/` - User profile page
  - `src/app/submit/` - Prompt submission page (requires auth)
  - `src/app/complete-profile/` - New user profile setup
  - `src/app/auth/callback/` - OAuth callback route
  - `src/app/auth/auth-code-error/` - Auth error page
  - `src/app/not-found.tsx` - Custom 404 page
- `src/components/` - React components (PromptCard, UpvoteButton, CopyButton, CategoryTabs, SearchBar, Header)
- `src/lib/supabase/` - Supabase clients (client.ts for browser, server.ts for server components, middleware.ts for session refresh)
- `src/lib/types.ts` - TypeScript types and constants (Category, AIModel, etc.)
- `src/middleware.ts` - Next.js middleware for Supabase session refresh
- `scripts/` - `import.ts` (importer CLI), `importers/` (sources, parsing helpers), `seed-prompts.ts` (legacy wrapper)
- `src/app/takedown/` - Removal-request page for authors of imported content

### Auth Flow
1. Google OAuth via Supabase (`/auth/callback` handles code exchange)
2. New users redirected to `/complete-profile` to set username and optional donation link
3. Middleware refreshes session on each request

### Data Fetching Patterns
- Server components use `createClient()` from `@/lib/supabase/server`
- Client components use `createClient()` from `@/lib/supabase/client`
- Pages with database queries use `export const dynamic = 'force-dynamic'`

### Image Hosting
`next.config.mjs` allows remote images from `lh3.googleusercontent.com` (Google avatars) and `avatars.githubusercontent.com` (GitHub avatars).

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

## Importer

`scripts/import.ts` pulls from Hugging Face and GitHub, attributes each item to its original author, and stores source URL + SPDX license. GitHub repos are only imported when their license is on the allowlist in `scripts/importers/sources/github.ts`. Repos to crawl are listed in the same file (prompt CSV/markdown files, Claude Code subagents, Cursor rules). Dedupes on `content_hash`, so re-runs are safe. Optional `GITHUB_TOKEN` raises API rate limits. `--enrich` has Claude (`claude-opus-5-5`, override with `ENRICH_MODEL`) set category and tidy title/description for new items only; needs `ANTHROPIC_API_KEY`; code in `scripts/importers/enrich.ts`. Optional `NEXT_PUBLIC_CONTACT_EMAIL` is shown on /takedown.
