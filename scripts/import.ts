/**
 * Importer for PromptDrop. Pulls prompts and agents from public sources,
 * records provenance (source URL, license, original author), and dedupes by content hash.
 *
 * Usage:
 *   npx tsx scripts/import.ts [--source huggingface|github|all] [--repo owner/name] [--dry-run] [--enrich]
 *
 * --enrich asks Claude to pick the category and tidy the title/description of each new item
 * (needs ANTHROPIC_API_KEY; roughly a few dollars per few thousand items). Items already in the
 * database are skipped before enrichment, so re-runs only pay for new content. In a dry run it
 * enriches a sample of 50 per source.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * Optional: GITHUB_TOKEN (raises the GitHub API rate limit from 60 to 5000 requests/hour).
 * Run supabase/migrations/001_provenance_and_agents.sql first.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ImportItem, Source } from './importers/types';
import { huggingface } from './importers/sources/huggingface';
import { githubSource } from './importers/sources/github';
import { enrich } from './importers/enrich';

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
const doEnrich = args.includes('--enrich');
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
  let alreadyPresent = 0;
  let batch: ImportItem[] = [];
  const dryItems: ImportItem[] = [];

  const flush = async () => {
    if (batch.length === 0 || !supabase) return;
    const pending = batch;
    batch = [];

    // Drop items already in the database so they are neither re-enriched nor re-sent.
    const { data: existing, error: lookupError } = await supabase
      .from('prompts')
      .select('content_hash')
      .in('content_hash', pending.map(i => i.content_hash));
    if (lookupError) {
      console.error(`\n  lookup failed: ${lookupError.message}`);
      return;
    }
    const have = new Set((existing ?? []).map(r => r.content_hash as string));
    const fresh = pending.filter(i => !have.has(i.content_hash));
    alreadyPresent += pending.length - fresh.length;
    if (fresh.length === 0) return;

    if (doEnrich) await enrich(fresh);

    // ignoreDuplicates keeps this safe if a row appears between the lookup and the insert.
    const { error } = await supabase.from('prompts').upsert(
      // Bulk inserts null-fill keys missing from some rows, so set the not-null array explicitly.
      fresh.map(item => ({ ...item, agent_tools: item.agent_tools ?? [], user_id: systemUserId, imported: true })),
      { onConflict: 'content_hash', ignoreDuplicates: true }
    );
    if (error) console.error(`\n  batch failed: ${error.message}`);
    else sent += fresh.length;
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
        dryItems.push(item);
        continue;
      }
      batch.push(item);
      if (batch.length >= BATCH_SIZE) await flush();
    }
    await flush();
    if (dryRun) {
      if (doEnrich) await enrich(dryItems.slice(0, 50)); // sample only, to keep dry runs cheap
      for (const item of dryItems) {
        console.log(`  [${item.type}/${item.category}] ${item.title} (${item.source_license}, ${item.original_author})`);
      }
      dryItems.length = 0;
    }
    console.log(`  ${sourceCount} unique items from ${source.name}`);
  }

  console.log(
    `\nDone. Seen ${seen}, unique ${seenHashes.size}` +
      (dryRun
        ? ' (dry run, nothing written).'
        : `, ${alreadyPresent} already in the database, sent ${sent} new.`)
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
