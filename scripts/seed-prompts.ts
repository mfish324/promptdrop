/**
 * Kept for backward compatibility: seeds from Hugging Face only.
 * For other sources use scripts/import.ts.
 */
process.argv.push('--source', 'huggingface');
import('./import');
