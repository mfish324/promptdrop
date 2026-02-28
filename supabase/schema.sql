-- PromptDrop Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  username text unique not null,
  avatar_url text,
  donation_link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Prompts table
create table public.prompts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null check (char_length(title) <= 100),
  description text not null,
  prompt_text text not null,
  category text not null check (category in ('coding', 'writing', 'analysis', 'creative', 'business', 'other')),
  ai_models text[] not null default '{}',
  upvotes integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Votes table
create table public.votes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  prompt_id uuid references public.prompts(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, prompt_id)
);

-- Indexes for performance
create index prompts_user_id_idx on public.prompts(user_id);
create index prompts_category_idx on public.prompts(category);
create index prompts_upvotes_idx on public.prompts(upvotes desc);
create index prompts_created_at_idx on public.prompts(created_at desc);
create index votes_user_id_idx on public.votes(user_id);
create index votes_prompt_id_idx on public.votes(prompt_id);

-- Full-text search index
create index prompts_search_idx on public.prompts using gin(to_tsvector('english', title || ' ' || description));

-- Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.prompts enable row level security;
alter table public.votes enable row level security;

-- Users policies
create policy "Users are viewable by everyone" on public.users
  for select using (true);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.users
  for insert with check (auth.uid() = id);

-- Prompts policies
create policy "Prompts are viewable by everyone" on public.prompts
  for select using (true);

create policy "Authenticated users can create prompts" on public.prompts
  for insert with check (auth.uid() = user_id);

create policy "Users can update own prompts" on public.prompts
  for update using (auth.uid() = user_id);

create policy "Users can delete own prompts" on public.prompts
  for delete using (auth.uid() = user_id);

-- Votes policies
create policy "Votes are viewable by everyone" on public.votes
  for select using (true);

create policy "Authenticated users can vote" on public.votes
  for insert with check (auth.uid() = user_id);

create policy "Users can remove own votes" on public.votes
  for delete using (auth.uid() = user_id);

-- Function to update upvote count
create or replace function update_prompt_upvotes()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.prompts set upvotes = upvotes + 1 where id = new.prompt_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.prompts set upvotes = upvotes - 1 where id = old.prompt_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Trigger for upvote count
create trigger on_vote_change
  after insert or delete on public.votes
  for each row execute function update_prompt_upvotes();

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup (optional - can also handle in app)
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute function public.handle_new_user();
