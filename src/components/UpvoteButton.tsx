'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface UpvoteButtonProps {
  promptId: string;
  upvotes: number;
  voted: boolean;
  isLoggedIn: boolean;
}

export function UpvoteButton({ promptId, upvotes, voted, isLoggedIn }: UpvoteButtonProps) {
  const [optimisticVoted, setOptimisticVoted] = useState(voted);
  const [optimisticUpvotes, setOptimisticUpvotes] = useState(upvotes);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  const handleVote = async () => {
    if (!isLoggedIn) {
      // Trigger sign in
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${window.location.pathname}`,
        },
      });
      return;
    }

    // Optimistic update
    setOptimisticVoted(!optimisticVoted);
    setOptimisticUpvotes(optimisticVoted ? optimisticUpvotes - 1 : optimisticUpvotes + 1);

    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (optimisticVoted) {
        // Remove vote
        await supabase
          .from('votes')
          .delete()
          .eq('user_id', user.id)
          .eq('prompt_id', promptId);
      } else {
        // Add vote
        await supabase
          .from('votes')
          .insert({ user_id: user.id, prompt_id: promptId });
      }

      router.refresh();
    });
  };

  return (
    <button
      onClick={handleVote}
      disabled={isPending}
      className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-[60px] ${
        optimisticVoted
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
          : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      <svg
        className={`w-5 h-5 ${optimisticVoted ? 'fill-current' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
      <span className="text-sm font-semibold">{optimisticUpvotes}</span>
    </button>
  );
}
