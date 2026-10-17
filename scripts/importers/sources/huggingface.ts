import type { ImportItem, Source } from '../types';
import { categorize, contentHash, describe, parseCsv, rejectReason } from '../util';

const DATASET_URL = 'https://huggingface.co/datasets/fka/awesome-chatgpt-prompts';
const CSV_URL = `${DATASET_URL}/raw/main/prompts.csv`;

export const huggingface: Source = {
  name: 'huggingface',

  async *fetch() {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Hugging Face fetch failed: ${response.status} ${response.statusText}`);
    }

    const [header, ...rows] = parseCsv(await response.text());
    const actIdx = header.findIndex(h => h.trim().toLowerCase() === 'act');
    const promptIdx = header.findIndex(h => h.trim().toLowerCase() === 'prompt');
    if (actIdx === -1 || promptIdx === -1) {
      throw new Error(`Unexpected CSV header: ${header.join(',')}`);
    }

    for (const row of rows) {
      const act = row[actIdx]?.trim();
      const text = row[promptIdx]?.trim();
      if (!act || !text) continue;

      const reason = rejectReason(text);
      if (reason) {
        console.log(`  skip "${act}": ${reason}`);
        continue;
      }

      const item: ImportItem = {
        type: 'prompt',
        title: act.substring(0, 100),
        description: describe(act, text),
        prompt_text: text,
        category: categorize(act, text),
        ai_models: ['claude', 'gpt4', 'gemini'],
        source_url: DATASET_URL,
        source_license: 'CC0-1.0',
        original_author: 'fka',
        content_hash: contentHash(text),
      };
      yield item;
    }
  },
};
