import Link from 'next/link';
import { PromptWithUser, Category } from '@/lib/types';
import { UpvoteButton } from './UpvoteButton';

interface PromptCardProps {
  prompt: PromptWithUser;
  userVoted?: boolean;
  isLoggedIn?: boolean;
}

const categoryBadgeClass: Record<Category, string> = {
  coding: 'badge-coding',
  writing: 'badge-writing',
  analysis: 'badge-analysis',
  creative: 'badge-creative',
  business: 'badge-business',
  other: 'badge-other',
};

export function PromptCard({ prompt, userVoted = false, isLoggedIn = false }: PromptCardProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div className="flex gap-4">
        <UpvoteButton
          promptId={prompt.id}
          upvotes={prompt.upvotes}
          voted={userVoted}
          isLoggedIn={isLoggedIn}
        />

        <div className="flex-1 min-w-0">
          <Link href={`/prompt/${prompt.id}`}>
            <h3 className="font-semibold text-lg hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {prompt.title}
            </h3>
          </Link>

          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">
            {prompt.description}
          </p>

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Link
              href={`/user/${prompt.user?.username}`}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              @{prompt.user?.username}
            </Link>

            <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryBadgeClass[prompt.category]}`}>
              {prompt.category}
            </span>

            <div className="flex gap-1">
              {prompt.ai_models.slice(0, 3).map((model) => (
                <span
                  key={model}
                  className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                >
                  {model}
                </span>
              ))}
              {prompt.ai_models.length > 3 && (
                <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  +{prompt.ai_models.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
