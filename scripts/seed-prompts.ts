/**
 * Seed script for PromptDrop
 * Fetches prompts from the fka/awesome-chatgpt-prompts dataset on Hugging Face
 *
 * Usage: npx tsx scripts/seed-prompts.ts
 * Requires: SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Category mapping based on keywords in the prompt
function categorizePrompt(title: string, prompt: string): string {
  const text = `${title} ${prompt}`.toLowerCase();

  if (text.match(/code|programming|developer|debug|software|api|function|script|bug/)) {
    return 'coding';
  }
  if (text.match(/write|essay|article|story|blog|content|copywriter|author|poet/)) {
    return 'writing';
  }
  if (text.match(/data|analyze|research|statistics|report|chart|insight/)) {
    return 'analysis';
  }
  if (text.match(/creative|art|design|music|game|story|imagination|brainstorm/)) {
    return 'creative';
  }
  if (text.match(/business|marketing|sales|startup|entrepreneur|strategy|product/)) {
    return 'business';
  }
  return 'other';
}

// Generate a short description from the prompt
function generateDescription(title: string, prompt: string): string {
  // Use first 1-2 sentences or first 200 chars
  const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 0) {
    const desc = sentences.slice(0, 2).join('. ').trim();
    if (desc.length > 200) {
      return desc.substring(0, 197) + '...';
    }
    return desc + (desc.endsWith('.') ? '' : '.');
  }
  return `A prompt for ${title.toLowerCase()}.`;
}

async function main() {
  console.log('Starting seed process...');

  // 1. Create or get the system user
  console.log('Creating system user...');

  // First check if system user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('username', 'promptdrop-curated')
    .single();

  let systemUserId: string;

  if (existingUser) {
    systemUserId = existingUser.id;
    console.log('System user already exists:', systemUserId);
  } else {
    // Create auth user first (using service role)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'curated@promptdrop.co',
      email_confirm: true,
      user_metadata: { username: 'promptdrop-curated' }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      process.exit(1);
    }

    systemUserId = authUser.user.id;

    // Create profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: systemUserId,
        email: 'curated@promptdrop.co',
        username: 'promptdrop-curated',
        donation_link: null,
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      process.exit(1);
    }

    console.log('Created system user:', systemUserId);
  }

  // 2. Fetch prompts from Hugging Face
  console.log('Fetching prompts from Hugging Face...');

  const response = await fetch(
    'https://huggingface.co/datasets/fka/awesome-chatgpt-prompts/raw/main/prompts.csv'
  );

  if (!response.ok) {
    console.error('Failed to fetch prompts:', response.statusText);
    process.exit(1);
  }

  const csvText = await response.text();
  const lines = csvText.split('\n').slice(1); // Skip header

  console.log(`Found ${lines.length} prompts`);

  // 3. Parse and transform prompts
  const prompts = lines
    .filter(line => line.trim().length > 0)
    .map(line => {
      // CSV parsing (handling quoted fields)
      // Format: "act","prompt" or act,prompt
      let act = '';
      let prompt = '';

      if (line.startsWith('"')) {
        // Quoted format
        const firstQuoteEnd = line.indexOf('","');
        if (firstQuoteEnd === -1) return null;
        act = line.substring(1, firstQuoteEnd);
        prompt = line.substring(firstQuoteEnd + 3, line.length - 1);
      } else {
        // Unquoted format
        const commaIndex = line.indexOf(',');
        if (commaIndex === -1) return null;
        act = line.substring(0, commaIndex);
        prompt = line.substring(commaIndex + 1);
      }

      if (!act || !prompt) return null;
      const cleanPrompt = prompt.replace(/^"|"$/g, '').replace(/""/g, '"');

      return {
        user_id: systemUserId,
        title: act.substring(0, 100),
        description: generateDescription(act, cleanPrompt),
        prompt_text: cleanPrompt,
        category: categorizePrompt(act, cleanPrompt),
        ai_models: ['claude', 'gpt4', 'gemini'],
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  console.log(`Parsed ${prompts.length} valid prompts`);

  // 4. Insert prompts in batches
  const batchSize = 50;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);

    const { error } = await supabase
      .from('prompts')
      .upsert(batch, { onConflict: 'title,user_id', ignoreDuplicates: true });

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      skipped += batch.length;
    } else {
      inserted += batch.length;
    }

    process.stdout.write(`\rInserted ${inserted}/${prompts.length} prompts...`);
  }

  console.log(`\n\nSeed complete!`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped: ${skipped}`);
}

main().catch(console.error);
