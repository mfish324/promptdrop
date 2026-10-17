export type Category = 'coding' | 'writing' | 'analysis' | 'creative' | 'business' | 'other';

export type PromptType = 'prompt' | 'agent';

export type AgentPlatform = 'claude-code' | 'cursor' | 'mcp' | 'other';

export type AIModel = 'claude' | 'gpt4' | 'gemini' | 'llama' | 'other';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  donation_link: string | null;
  created_at: string;
}

export interface Prompt {
  id: string;
  user_id: string;
  title: string;
  description: string;
  prompt_text: string;
  category: Category;
  ai_models: AIModel[];
  upvotes: number;
  created_at: string;
  type: PromptType;
  // Provenance (set for imported content)
  source_url: string | null;
  source_license: string | null;
  original_author: string | null;
  imported: boolean;
  content_hash: string | null;
  // Agent-only fields
  agent_platform: AgentPlatform | null;
  agent_tools: string[];
  usage_notes: string | null;
  // Joined fields
  user?: User;
}

export interface Vote {
  id: string;
  user_id: string;
  prompt_id: string;
  created_at: string;
}

export interface PromptWithUser extends Prompt {
  user: User;
}

export const PROMPT_TYPES: { value: PromptType; label: string; plural: string }[] = [
  { value: 'prompt', label: 'Prompt', plural: 'Prompts' },
  { value: 'agent', label: 'Agent', plural: 'Agents' },
];

export const AGENT_PLATFORMS: { value: AgentPlatform; label: string }[] = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'mcp', label: 'MCP' },
  { value: 'other', label: 'Other' },
];

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'coding', label: 'Coding' },
  { value: 'writing', label: 'Writing' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'creative', label: 'Creative' },
  { value: 'business', label: 'Business' },
  { value: 'other', label: 'Other' },
];

export const AI_MODELS: { value: AIModel; label: string }[] = [
  { value: 'claude', label: 'Claude' },
  { value: 'gpt4', label: 'GPT-4' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'llama', label: 'Llama' },
  { value: 'other', label: 'Other' },
];
