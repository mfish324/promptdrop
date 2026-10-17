import { createHash } from 'node:crypto';
import type { Category } from './types';

const MIN_LENGTH = 40;
const MAX_LENGTH = 20000;

export function contentHash(text: string): string {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(normalized).digest('hex');
}

/** Quality gate for imported text. Returns a skip reason, or null if acceptable. */
export function rejectReason(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length < MIN_LENGTH) return 'too short';
  if (trimmed.length > MAX_LENGTH) return 'too long';
  if (trimmed.split(/\s+/).length < 8) return 'too few words';
  return null;
}

/** RFC 4180 CSV parser: quoted fields, escaped quotes, embedded newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some(f => f.length > 0)) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some(f => f.length > 0)) rows.push(row);
  return rows;
}

export interface Frontmatter {
  data: Record<string, string>;
  body: string;
}

/** Minimal YAML frontmatter reader: flat `key: value` pairs only. */
export function parseFrontmatter(text: string): Frontmatter {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: text };

  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) data[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { data, body: match[2] };
}

export function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map(s => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

const CATEGORY_KEYWORDS: Record<Exclude<Category, 'other'>, RegExp> = {
  coding: /\b(code|coding|program(?:ming|mer)?|developer|debug(?:ging)?|software|api|function|script|bug|refactor|sql|javascript|python|typescript|devops|linux|terminal|git|compiler|test(?:ing)?)\b/g,
  writing: /\b(write|writer|writing|essay|article|story|blog|copywriter|copywriting|author|poet|poem|editor|proofread|grammar|novel|screenwriter)\b/g,
  analysis: /\b(data|analy[sz]e|analysis|analyst|research|statistics|statistician|report|chart|insight|evaluate|review)\b/g,
  creative: /\b(creative|art|artist|design|designer|music|musician|game|imagination|brainstorm|drawing|painter|composer|storyteller)\b/g,
  business: /\b(business|marketing|sales|startup|entrepreneur|strategy|product manager|finance|accountant|seo|customer|recruiter|consultant)\b/g,
};

/** Picks the category with the most keyword hits; title hits count triple. */
export function categorize(title: string, body: string): Category {
  let best: Category = 'other';
  let bestScore = 0;
  for (const [category, re] of Object.entries(CATEGORY_KEYWORDS) as [Category, RegExp][]) {
    const score =
      (title.toLowerCase().match(re)?.length ?? 0) * 3 +
      (body.toLowerCase().slice(0, 2000).match(re)?.length ?? 0);
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }
  return best;
}

/** First one or two sentences of the text, capped at 200 chars. */
export function describe(title: string, text: string): string {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 0);
  if (sentences.length === 0) return `A prompt for ${title.toLowerCase()}.`;
  const desc = sentences.slice(0, 2).join(' ').trim();
  return desc.length > 200 ? desc.substring(0, 197) + '...' : desc;
}
