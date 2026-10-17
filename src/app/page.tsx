import { createClient } from '@/lib/supabase/server';
import { PromptCard } from '@/components/PromptCard';
import { CategoryTabs } from '@/components/CategoryTabs';
import { TypeTabs } from '@/components/TypeTabs';
import { PromptWithUser, Category, PromptType } from '@/lib/types';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams: Promise<{
    category?: string;
    type?: string;
    q?: string;
    sort?: 'upvotes' | 'recent';
  }>;
}

async function PromptList({ category, type, query, sort }: { category?: string; type?: string; query?: string; sort?: string }) {
  const supabase = await createClient();

  // Get current user and their votes
  const { data: { user } } = await supabase.auth.getUser();

  let promptsQuery = supabase
    .from('prompts')
    .select('*, user:users(*)');

  // Apply category filter
  if (category && category !== 'all') {
    promptsQuery = promptsQuery.eq('category', category as Category);
  }

  // Apply type filter
  if (type === 'prompt' || type === 'agent') {
    promptsQuery = promptsQuery.eq('type', type as PromptType);
  }

  // Apply search filter (strip characters that would break the PostgREST or() syntax)
  const safeQuery = query?.replace(/[,()%*\\]/g, ' ').trim();
  if (safeQuery) {
    promptsQuery = promptsQuery.or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`);
  }

  // Apply sorting
  if (sort === 'recent') {
    promptsQuery = promptsQuery.order('created_at', { ascending: false });
  } else {
    promptsQuery = promptsQuery.order('upvotes', { ascending: false });
  }

  const { data: prompts, error } = await promptsQuery.limit(50);

  if (error) {
    console.error('Error fetching prompts:', error);
    return <p className="text-red-500">Error loading prompts</p>;
  }

  // Get user's votes if logged in
  let userVotes: Set<string> = new Set();
  if (user) {
    const { data: votes } = await supabase
      .from('votes')
      .select('prompt_id')
      .eq('user_id', user.id);
    userVotes = new Set(votes?.map(v => v.prompt_id) || []);
  }

  if (!prompts || prompts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Nothing found.</p>
        <p className="text-sm mt-2">Try a different filter, or be the first to submit one!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prompts.map((prompt) => (
        <PromptCard
          key={prompt.id}
          prompt={prompt as PromptWithUser}
          userVoted={userVotes.has(prompt.id)}
          isLoggedIn={!!user}
        />
      ))}
    </div>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const { category, type, q: query, sort } = params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Prompts and agents worth reusing</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
          Browse community-shared AI prompts and agent definitions, copy what works, and support the people who made them.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Suspense fallback={<div className="h-10" />}>
          <TypeTabs />
        </Suspense>

        <div className="flex gap-2">
          <SortButton params={params} value="upvotes" label="Top" />
          <SortButton params={params} value="recent" label="Recent" />
        </div>
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <CategoryTabs />
      </Suspense>

      <Suspense fallback={<PromptListSkeleton />}>
        <PromptList category={category} type={type} query={query} sort={sort} />
      </Suspense>
    </div>
  );
}

function SortButton({ params, value, label }: { params: Record<string, string | undefined>; value: string; label: string }) {
  const isActive = params.sort === value || (!params.sort && value === 'upvotes');
  // Keep the other filters when switching sort order
  const next = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val && key !== 'sort') next.set(key, val);
  }
  if (value !== 'upvotes') next.set('sort', value);
  const qs = next.toString();
  const href = qs ? `/?${qs}` : '/';

  return (
    <a
      href={href}
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
        isActive
          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {label}
    </a>
  );
}

function PromptListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 animate-pulse">
          <div className="flex gap-4">
            <div className="w-[60px] h-[60px] bg-gray-200 dark:bg-gray-800 rounded-lg" />
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
              <div className="flex gap-2">
                <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-16" />
                <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
