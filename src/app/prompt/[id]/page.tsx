import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CopyButton } from '@/components/CopyButton';
import { UpvoteButton } from '@/components/UpvoteButton';
import { PromptWithUser, Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PromptPageProps {
  params: Promise<{ id: string }>;
}

const categoryBadgeClass: Record<Category, string> = {
  coding: 'badge-coding',
  writing: 'badge-writing',
  analysis: 'badge-analysis',
  creative: 'badge-creative',
  business: 'badge-business',
  other: 'badge-other',
};

export default async function PromptPage({ params }: PromptPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: prompt, error } = await supabase
    .from('prompts')
    .select('*, user:users(*)')
    .eq('id', id)
    .single();

  if (error || !prompt) {
    notFound();
  }

  const typedPrompt = prompt as PromptWithUser;

  // Check if user has voted
  const { data: { user } } = await supabase.auth.getUser();
  let userVoted = false;
  if (user) {
    const { data: vote } = await supabase
      .from('votes')
      .select('id')
      .eq('user_id', user.id)
      .eq('prompt_id', id)
      .single();
    userVoted = !!vote;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to prompts
      </Link>

      <div className="flex gap-4 items-start mb-6">
        <UpvoteButton
          promptId={typedPrompt.id}
          upvotes={typedPrompt.upvotes}
          voted={userVoted}
          isLoggedIn={!!user}
        />
        <div>
          <h1 className="text-2xl font-bold">{typedPrompt.title}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryBadgeClass[typedPrompt.category]}`}>
              {typedPrompt.category}
            </span>
            {typedPrompt.ai_models.map((model) => (
              <span
                key={model}
                className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              >
                {model}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {typedPrompt.description}
      </p>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Prompt</h2>
          <CopyButton text={typedPrompt.prompt_text} />
        </div>
        <div className="prompt-text">
          {typedPrompt.prompt_text}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg font-medium">
            {typedPrompt.user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <Link
              href={`/user/${typedPrompt.user?.username}`}
              className="font-medium hover:text-blue-600 dark:hover:text-blue-400"
            >
              @{typedPrompt.user?.username}
            </Link>
            {typedPrompt.user?.donation_link && (
              <a
                href={typedPrompt.user.donation_link}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 hover:underline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                Support this creator
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
