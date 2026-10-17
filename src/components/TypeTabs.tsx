'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { PROMPT_TYPES } from '@/lib/types';

export function TypeTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const current = searchParams.get('type') || 'all';

  const handleChange = (type: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (type === 'all') {
        params.delete('type');
      } else {
        params.set('type', type);
      }
      router.push(`/?${params.toString()}`);
    });
  };

  const tabs = [{ value: 'all', label: 'Everything' }, ...PROMPT_TYPES.map(t => ({ value: t.value, label: t.plural }))];

  return (
    <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-800 p-1" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={current === tab.value}
          onClick={() => handleChange(tab.value)}
          disabled={isPending}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            current === tab.value
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
