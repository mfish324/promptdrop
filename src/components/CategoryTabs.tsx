'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { CATEGORIES } from '@/lib/types';

export function CategoryTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const currentCategory = searchParams.get('category') || 'all';

  const handleCategoryChange = (category: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (category === 'all') {
        params.delete('category');
      } else {
        params.set('category', category);
      }
      router.push(`/?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => handleCategoryChange('all')}
        disabled={isPending}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          currentCategory === 'all'
            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        All
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => handleCategoryChange(cat.value)}
          disabled={isPending}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentCategory === cat.value
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
