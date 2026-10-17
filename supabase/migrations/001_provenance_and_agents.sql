-- Migration 001: provenance for imported content + agent support
-- Run in the Supabase SQL editor on an existing database.
-- (Fresh installs get the same columns from schema.sql.)

alter table public.prompts
  add column if not exists type text not null default 'prompt'
    check (type in ('prompt', 'agent')),
  add column if not exists source_url text,
  add column if not exists source_license text,
  add column if not exists original_author text,
  add column if not exists imported boolean not null default false,
  add column if not exists content_hash text,
  add column if not exists agent_platform text
    check (agent_platform is null or agent_platform in ('claude-code', 'cursor', 'mcp', 'other')),
  add column if not exists agent_tools text[] not null default '{}',
  add column if not exists usage_notes text;

-- Dedupe key for importers. NULLs are distinct, so user-submitted rows are unaffected.
alter table public.prompts
  drop constraint if exists prompts_content_hash_key;
alter table public.prompts
  add constraint prompts_content_hash_key unique (content_hash);

create index if not exists prompts_type_idx on public.prompts(type);
create index if not exists prompts_imported_idx on public.prompts(imported);

-- Only the service role (importers) may create imported rows.
drop policy if exists "Authenticated users can create prompts" on public.prompts;
create policy "Authenticated users can create prompts" on public.prompts
  for insert with check (auth.uid() = user_id and imported = false);

-- Owners can edit their prompts but cannot flip the provenance flag.
drop policy if exists "Users can update own prompts" on public.prompts;
create policy "Users can update own prompts" on public.prompts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id and imported = false);
