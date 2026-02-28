'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function CompleteProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState('');
  const [donationLink, setDonationLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setEmail(user.email || '');

      // Pre-fill username from email
      const suggestedUsername = user.email?.split('@')[0] || '';
      setUsername(suggestedUsername);

      // Check if profile already exists
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profile) {
        router.push('/');
      }
    };

    checkUser();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in');
        return;
      }

      // Check if username is taken
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.trim().toLowerCase())
        .single();

      if (existing) {
        setError('Username is already taken');
        setIsSubmitting(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          username: username.trim().toLowerCase(),
          avatar_url: user.user_metadata?.avatar_url || null,
          donation_link: donationLink.trim() || null,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('Username is already taken');
        } else {
          throw insertError;
        }
        setIsSubmitting(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Profile creation error:', err);
      setError('Failed to create profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-2">Complete Your Profile</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Welcome to PromptDrop! Choose a username to get started.
      </p>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500"
          />
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-2">
            Username <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              required
              minLength={3}
              maxLength={20}
              placeholder="your_username"
              className="w-full px-4 py-2 pl-8 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">3-20 characters, lowercase letters, numbers, and underscores only</p>
        </div>

        <div>
          <label htmlFor="donationLink" className="block text-sm font-medium mb-2">
            Donation Link <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            id="donationLink"
            value={donationLink}
            onChange={(e) => setDonationLink(e.target.value)}
            placeholder="https://ko-fi.com/yourusername"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Ko-fi, PayPal.me, Buy Me a Coffee, etc.</p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !username || username.length < 3}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {isSubmitting ? 'Creating Profile...' : 'Complete Profile'}
        </button>
      </form>
    </div>
  );
}
