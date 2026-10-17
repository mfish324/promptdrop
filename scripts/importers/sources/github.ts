import path from 'node:path';
import type { AgentPlatform, ImportItem, Source } from '../types';
import {
  categorize,
  contentHash,
  describe,
  parseCsv,
  parseFrontmatter,
  rejectReason,
  splitList,
} from '../util';

/**
 * Repos are only imported when GitHub reports one of these SPDX licenses.
 * Repos with no license (all rights reserved) or a restrictive one are skipped.
 */
const ALLOWED_LICENSES = new Set([
  'MIT',
  'Apache-2.0',
  'CC0-1.0',
  'CC-BY-4.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'Unlicense',
]);

type RepoKind = 'prompt-files' | 'agents' | 'cursor-rules';

interface RepoConfig {
  repo: string; // owner/name
  kind: RepoKind;
}

/** Starting list; the license check at runtime is what makes a repo importable. */
const REPOS: RepoConfig[] = [
  { repo: 'f/awesome-chatgpt-prompts', kind: 'prompt-files' },
  { repo: 'wshobson/agents', kind: 'agents' },
  { repo: 'VoltAgent/awesome-claude-code-subagents', kind: 'agents' },
  { repo: 'PatrickJS/awesome-cursorrules', kind: 'cursor-rules' },
];

const token = process.env.GITHUB_TOKEN;

async function api<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'promptdrop-importer',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
    throw new Error('GitHub rate limit hit. Set GITHUB_TOKEN to raise the limit.');
  }
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

interface RepoInfo {
  full_name: string;
  html_url: string;
  default_branch: string;
  license: { spdx_id: string } | null;
  owner: { login: string };
}

interface TreeEntry {
  path: string;
  type: 'blob' | 'tree';
}

async function rawFile(repo: RepoInfo, filePath: string): Promise<string | null> {
  const encoded = filePath.split('/').map(encodeURIComponent).join('/');
  const url = `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch}/${encoded}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'promptdrop-importer' } });
  return res.ok ? res.text() : null;
}

function titleFromPath(filePath: string): string {
  return path
    .basename(filePath, path.extname(filePath))
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function provenance(repo: RepoInfo, filePath: string) {
  return {
    source_url: `${repo.html_url}/blob/${repo.default_branch}/${filePath}`,
    source_license: repo.license!.spdx_id,
    original_author: repo.owner.login,
  };
}

async function* promptFiles(repo: RepoInfo, files: string[]): AsyncGenerator<ImportItem> {
  // CSV files with act/prompt columns (awesome-chatgpt-prompts layout)
  for (const file of files.filter(f => f.endsWith('prompts.csv'))) {
    const text = await rawFile(repo, file);
    if (!text) continue;
    const [header, ...rows] = parseCsv(text);
    const actIdx = header.findIndex(h => h.trim().toLowerCase() === 'act');
    const promptIdx = header.findIndex(h => h.trim().toLowerCase() === 'prompt');
    if (actIdx === -1 || promptIdx === -1) continue;

    for (const row of rows) {
      const title = row[actIdx]?.trim();
      const body = row[promptIdx]?.trim();
      if (!title || !body || rejectReason(body)) continue;
      yield {
        type: 'prompt',
        title: title.substring(0, 100),
        description: describe(title, body),
        prompt_text: body,
        category: categorize(title, body),
        ai_models: ['claude', 'gpt4', 'gemini'],
        content_hash: contentHash(body),
        ...provenance(repo, file),
      };
    }
  }

  // One prompt per markdown file under a prompts/ directory
  for (const file of files.filter(f => /(^|\/)prompts\/.+\.md$/i.test(f))) {
    const text = await rawFile(repo, file);
    if (!text) continue;
    const { data, body } = parseFrontmatter(text);
    const heading = body.match(/^#\s+(.+)$/m)?.[1];
    const title = (data.title || data.name || heading || titleFromPath(file)).substring(0, 100);
    const content = body.replace(/^#\s+.+\n?/m, '').trim();
    if (rejectReason(content)) continue;
    yield {
      type: 'prompt',
      title,
      description: data.description || describe(title, content),
      prompt_text: content,
      category: categorize(title, content),
      ai_models: ['claude', 'gpt4', 'gemini'],
      content_hash: contentHash(content),
      ...provenance(repo, file),
    };
  }
}

async function* agentFiles(repo: RepoInfo, files: string[]): AsyncGenerator<ImportItem> {
  // Claude Code subagents: markdown with name/description/tools frontmatter,
  // under agents/ (wshobson/agents) or categories/ (VoltAgent)
  for (const file of files.filter(
    f => /(^|\/)(agents|categories)\/.+\.md$/i.test(f) && !/(readme|contributing|changelog)/i.test(f)
  )) {
    const text = await rawFile(repo, file);
    if (!text) continue;
    const { data, body } = parseFrontmatter(text);
    if (!data.name || !data.description) continue;
    const system = body.trim();
    if (rejectReason(system)) continue;

    const title = data.name.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    yield {
      type: 'agent',
      title: title.substring(0, 100),
      description: data.description.substring(0, 300),
      prompt_text: system,
      category: categorize(title, `${data.description} ${system}`),
      ai_models: ['claude'],
      agent_platform: 'claude-code' as AgentPlatform,
      agent_tools: splitList(data.tools),
      usage_notes: `Save as .claude/agents/${path.basename(file)} in your project (or ~/.claude/agents/ for all projects).`,
      content_hash: contentHash(system),
      ...provenance(repo, file),
    };
  }
}

async function* cursorRuleFiles(repo: RepoInfo, files: string[]): AsyncGenerator<ImportItem> {
  for (const file of files.filter(f => /\.mdc$|(^|\/)\.cursorrules$/i.test(f))) {
    const text = await rawFile(repo, file);
    if (!text) continue;
    const { data, body } = parseFrontmatter(text);
    const rules = body.trim();
    if (rejectReason(rules)) continue;

    const dir = path.basename(path.dirname(file));
    const title = (
      data.description && data.description.length <= 100
        ? data.description
        : titleFromPath(dir === '.' || dir === 'rules' ? file : dir)
    ).substring(0, 100);
    yield {
      type: 'agent',
      title,
      description: data.description || describe(title, rules),
      prompt_text: rules,
      category: categorize(title, rules),
      ai_models: ['other'],
      agent_platform: 'cursor' as AgentPlatform,
      agent_tools: [],
      usage_notes: 'Place in .cursor/rules/ (or as .cursorrules) at the root of your project.',
      content_hash: contentHash(rules),
      ...provenance(repo, file),
    };
  }
}

export function githubSource(only?: string): Source {
  const repos: RepoConfig[] = only
    ? [REPOS.find(r => r.repo.toLowerCase() === only.toLowerCase()) ?? { repo: only, kind: 'prompt-files' }]
    : REPOS;

  return {
    name: 'github',

    async *fetch() {
      for (const { repo: fullName, kind } of repos) {
        console.log(`\nRepo ${fullName} (${kind})`);
        let info: RepoInfo;
        try {
          info = await api<RepoInfo>(`https://api.github.com/repos/${fullName}`);
        } catch (err) {
          console.log(`  skip repo: ${(err as Error).message}`);
          continue;
        }

        const spdx = info.license?.spdx_id;
        if (!spdx || !ALLOWED_LICENSES.has(spdx)) {
          console.log(`  skip repo: license ${spdx ?? 'none'} is not on the allowlist`);
          continue;
        }

        const tree = await api<{ tree: TreeEntry[]; truncated: boolean }>(
          `https://api.github.com/repos/${info.full_name}/git/trees/${info.default_branch}?recursive=1`
        );
        if (tree.truncated) console.log('  warning: file tree truncated, some files will be missed');
        const files = tree.tree.filter(e => e.type === 'blob').map(e => e.path);

        yield* kind === 'agents'
          ? agentFiles(info, files)
          : kind === 'cursor-rules'
            ? cursorRuleFiles(info, files)
            : promptFiles(info, files);
      }
    },
  };
}
