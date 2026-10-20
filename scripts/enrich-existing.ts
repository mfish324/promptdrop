/**
 * Re-labels imported rows already in the database with Claude (category, title, description).
 * Only touches rows with imported = true; user submissions are never modified.
 *
 * Usage: npx tsx scripts/enrich-existing.ts [--limit N] [--dry-run]
 * Requires SUPABASE_SERVICE_ROLE_KEY and ANTHROPIC_API_KEY in .env.local.
 */

import { createClient } from '@supabase/supabase-js';
import { enrich } from './importers/enrich';
import type { ImportItem } from './importers/types';

try {
  process.loadEnvFile('.env.local');
} catch {
  // Env may already be set by the shell.
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx === -1 ? Infinity : Number(args[limitIdx + 1]);

const PAGE = 200;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  let offset = 0;
  let processed = 0;
  let changed = 0;

  while (processed < limit) {
    const { data, error } = await supabase
      .from('prompts')
      .select('id, type, title, description, prompt_text, category')
      .eq('imported', true)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    offset += data.length;

    const rows = data.slice(0, limit - processed);
    const items = rows.map(r => ({ ...r }) as unknown as ImportItem);
    await enrich(items);

    for (let i = 0; i < rows.length; i++) {
      const before = rows[i];
      const after = items[i];
      if (
        before.category === after.category &&
        before.title === after.title &&
        before.description === after.description
      ) {
        continue;
      }
      changed++;
      if (dryRun) {
        console.log(
          `  ${before.type}: "${before.title}" [${before.category}] -> "${after.title}" [${after.category}]\n    ${after.description}`
        );
        continue;
      }
      const { error: updateError } = await supabase
        .from('prompts')
        .update({ category: after.category, title: after.title, description: after.description })
        .eq('id', (before as { id: string }).id);
      if (updateError) console.error(`  update failed for ${before.title}: ${updateError.message}`);
    }

    processed += rows.length;
    process.stdout.write(`\rProcessed ${processed}, changed ${changed}`);
  }

  console.log(`\nDone. Processed ${processed}, changed ${changed}${dryRun ? ' (dry run, nothing written)' : ''}.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
