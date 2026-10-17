/**
 * Importer for PromptDrop. Pulls prompts and agents from public sources,
 * records provenance (source URL, license, original author), and dedupes by content hash.
 *
 * Usage:
 *   npx tsx scripts/import.ts [--source huggingface|github|all] [--repo owner/name] [--dry-run]
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * Optional: GITHUB_TOKEN (raises the GitHub API rate limit from 60 to 5000 requests/hour).
 * Run supabase/migrations/001_provenance_and_agents.sql first.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ImportItem, Source } from './importers/types';
import { huggingface } from './importers/sources/huggingface';
import { githubSource } from './importers/sources/github';

try {
  process.loadEnvFile('.env.local');
} catch {
  // Env may already be set by the shell.
}

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1] ?? '';
};
const dryRun = args.includes('--dry-run');
const sourceArg = flag('source') ?? 'all';
const repoArg = flag('repo');

const SYSTEM_USERNAME = 'promptdrop-curated';
const BATCH_SIZE = 50;

async function getSystemUserId(supabase: SupabaseClient): Promise<string> {
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', SYSTEM_USERNAME)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: 'curated@promptdrop.co',
    email_confirm: true,
    user_metadata: { username: SYSTEM_USERNAME },
  });
  if (authError || !authUser.user) {
    throw new Error(`Creating system auth user failed: ${authError?.message}`);
  }

  const { error: profileError } = await supabase.from('users').insert({
    id: authUser.user.id,
    email: 'curated@promptdrop.co',
    username: SYSTEM_USERNAME,
    donation_link: null,
  });
  if (profileError) throw new Error(`Creating system profile failed: ${profileError.message}`);
  return authUser.user.id;
}

function pickSources(): Source[] {
  if (repoArg) return [githubSource(repoArg)];
  switch (sourceArg) {
    case 'huggingface': return [huggingface];
    case 'github': return [githubSource()];
    case 'all': return [huggingface, githubSource()];
    default:
      console.error(`Unknown --source "${sourceArg}". Use huggingface, github, or all.`);
      process.exit(1);
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!dryRun && (!url || !key)) {
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = dryRun ? null : createClient(url!, key!);
  const systemUserId = supabase ? await getSystemUserId(supabase) : 'dry-run';

  let seen = 0;
  let sent = 0;
  const seenHashes = new Set<string>();
  let batch: Record<string, unknown>[] = [];

  const flush = async () => {
    if (batch.length === 0 || !supabase) return;
    // ignoreDuplicates leaves existing rows untouched, so re-runs are safe.
    const { error } = await supabase
      .from('prompts')
      .upsert(batch, { onConflict: 'content_hash', ignoreDuplicates: true });
    if (error) console.error(`\n  batch failed: ${error.message}`);
    else sent += batch.length;
    batch = [];
  };

  for (const source of pickSources()) {
    console.log(`\n=== Source: ${source.name}`);
    let sourceCount = 0;
    for await (const item of source.fetch() as AsyncGenerator<ImportItem>) {
      seen++;
      if (seenHashes.has(item.content_hash)) continue; // duplicate within this run
      seenHashes.add(item.content_hash);
      sourceCount++;

      if (dryRun) {
        console.log(`  [${item.type}/${item.category}] ${item.title} (${item.source_license}, ${item.original_author})`);
        continue;
      }
      batch.push({ ...item, user_id: systemUserId, imported: true });
      if (batch.length >= BATCH_SIZE) await flush();
    }
    await flush();
    console.log(`  ${sourceCount} unique items from ${source.name}`);
  }

  console.log(
    `\nDone. Seen ${seen}, unique ${seenHashes.size}` +
      (dryRun ? ' (dry run, nothing written).' : `, sent to database ${sent}. Existing rows were left unchanged.`)
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
