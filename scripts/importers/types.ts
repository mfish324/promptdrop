export type Category = 'coding' | 'writing' | 'analysis' | 'creative' | 'business' | 'other';
export type AIModel = 'claude' | 'gpt4' | 'gemini' | 'llama' | 'other';
export type AgentPlatform = 'claude-code' | 'cursor' | 'mcp' | 'other';

/** A prompt or agent ready to insert, minus user_id (the runner adds it). */
export interface ImportItem {
  type: 'prompt' | 'agent';
  title: string;
  description: string;
  prompt_text: string;
  category: Category;
  ai_models: AIModel[];
  source_url: string;
  source_license: string;
  original_author: string;
  content_hash: string;
  agent_platform?: AgentPlatform;
  agent_tools?: string[];
  usage_notes?: string;
}

export interface Source {
  name: string;
  /** Yields items; may log its own skips. */
  fetch(): AsyncGenerator<ImportItem>;
}
