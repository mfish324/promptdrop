import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { PromptCard } from '@/components/PromptCard';
import { PromptWithUser } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface UserPageProps {
  params: Promise<{ username: string }>;
}

export default async function UserPage({ params }: UserPageProps) {
  const { username } = await params;
  const supabase = await createClient();

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  // Get user's prompts
  const { data: prompts } = await supabase
    .from('prompts')
    .select('*, user:users(*)')
    .eq('user_id', profile.id)
    .order('upvotes', { ascending: false });

  // Calculate total upvotes
  const totalUpvotes = prompts?.reduce((sum, p) => sum + p.upvotes, 0) || 0;

  // Check if current user has voted on any prompts
  const { data: { user } } = await supabase.auth.getUser();
  let userVotes: Set<string> = new Set();
  if (user && prompts) {
    const promptIds = prompts.map(p => p.id);
    const { data: votes } = await supabase
      .from('votes')
      .select('prompt_id')
      .eq('user_id', user.id)
      .in('prompt_id', promptIds);
    userVotes = new Set(votes?.map(v => v.prompt_id) || []);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start gap-6 mb-8">
        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl font-bold shrink-0 overflow-hidden">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.username}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          ) : (
            profile.username[0].toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">@{profile.username}</h1>
          <div className="flex gap-6 mt-2 text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-semibold text-foreground">{prompts?.length || 0}</span> prompts
            </div>
            <div>
              <span className="font-semibold text-foreground">{totalUpvotes}</span> upvotes
            </div>
          </div>
          {profile.donation_link && (
            <a
              href={profile.donation_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      <h2 className="text-lg font-semibold mb-4">Prompts by @{profile.username}</h2>

      {prompts && prompts.length > 0 ? (
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
      ) : (
        <p className="text-gray-500 text-center py-8">No prompts yet</p>
      )}
    </div>
  );
}
