'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES, AI_MODELS, Category, AIModel } from '@/lib/types';

export default function SubmitPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [promptText, setPromptText] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');

  const handleModelToggle = (model: AIModel) => {
    setAiModels(prev =>
      prev.includes(model)
        ? prev.filter(m => m !== model)
        : [...prev, model]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to submit a prompt');
        setIsSubmitting(false);
        return;
      }

      // Check if user profile exists
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        router.push('/complete-profile');
        return;
      }

      const { error: insertError } = await supabase
        .from('prompts')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          prompt_text: promptText.trim(),
          category,
          ai_models: aiModels.length > 0 ? aiModels : ['other'],
        });

      if (insertError) {
        throw insertError;
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to submit prompt. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Submit a Prompt</h1>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            required
            placeholder="E.g., Code Review Assistant"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
            placeholder="What does this prompt do? When should someone use it?"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="promptText" className="block text-sm font-medium mb-2">
            Prompt Text <span className="text-red-500">*</span>
          </label>
          <textarea
            id="promptText"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            required
            rows={8}
            placeholder="Paste your prompt here..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            AI Models <span className="text-gray-500 font-normal">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {AI_MODELS.map((model) => (
              <button
                key={model.value}
                type="button"
                onClick={() => handleModelToggle(model.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  aiModels.includes(model.value)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {model.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title || !description || !promptText}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Prompt'}
          </button>
        </div>
      </form>

      {showPreview && (
        <div className="mt-8 p-6 border border-gray-200 dark:border-gray-800 rounded-lg">
          <h2 className="text-sm text-gray-500 mb-4">Preview</h2>
          <h3 className="text-xl font-bold mb-2">{title || 'Untitled'}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{description || 'No description'}</p>
          <div className="prompt-text">
            {promptText || 'No prompt text'}
          </div>
          <div className="flex gap-2 mt-4">
            <span className={`px-2 py-0.5 rounded text-xs font-medium badge-${category}`}>
              {category}
            </span>
            {aiModels.map((model) => (
              <span
                key={model}
                className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800"
              >
                {model}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
