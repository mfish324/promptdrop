'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { SearchBar } from './SearchBar';

function SearchBarFallback() {
  return (
    <div className="w-full h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
  );
}

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold shrink-0">
            PromptDrop
          </Link>

          <div className="flex-1 max-w-xl hidden sm:block">
            <Suspense fallback={<SearchBarFallback />}>
              <SearchBar />
            </Suspense>
          </div>

          <div className="flex items-center gap-3">
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link
                      href="/submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Submit
                    </Link>
                    <div className="relative group">
                      <button className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-sm font-medium">
                          {user.email?.[0].toUpperCase()}
                        </div>
                      </button>
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        <Link
                          href={`/user/${user.user_metadata?.username || user.id}`}
                          className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-t-lg"
                        >
                          Profile
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-b-lg text-red-600"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={handleSignIn}
                    className="bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Sign In
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-4 sm:hidden">
          <Suspense fallback={<SearchBarFallback />}>
            <SearchBar />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
