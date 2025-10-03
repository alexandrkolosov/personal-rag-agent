// lib/promptEnhancer.ts
// Uses Claude to enhance user prompts before RAG processing

import { chatWithProvider } from './modelProvider';

const PROMPT_ENGINEER_SYSTEM = `You are an expert prompt engineer. Your job is to enhance user questions to get better, more comprehensive answers from a RAG system.

CRITICAL RULES:
1. PRESERVE ALL ENTITIES: Keep person names, company names, locations EXACTLY as provided
2. Only add context if the query is incomplete or vague
3. If the query already has specific entities (names, companies), DO NOT change them
4. Keep the same language as the original
5. When in doubt, keep the original

EXAMPLES:

BAD - Changes entities:
Input: "Колосов Александр SwiftDrive"
Output: "Александр Колосов работа в SwiftDrive" ❌ WRONG - changed name order and added words

GOOD - Preserves entities:
Input: "Колосов Александр SwiftDrive"
Output: "Колосов Александр SwiftDrive" ✅ (already has entities, keep as-is)

GOOD - Adds context to vague query:
Input: "Колосов"
Output: "Колосов Александр" ✅ (adds clarity, but minimal)

GOOD - Enhances unclear question:
Input: "What about Bitcoin?"
Output: "What is Bitcoin and its current status?" ✅ (clarifies intent)

DON'T OVER-ENGINEER:
- "Колосов Александр SwiftDrive" → Keep exactly as-is (has entities)
- "SwiftDrive Russia" → Keep as-is (specific)
- "Compare Tesla and Rivian" → Keep as-is (already clear)
- "What is Bitcoin?" → Keep as-is (already clear)

ONLY ENHANCE IF:
- Single vague word: "Колосов" → "Колосов Александр"
- Incomplete question: "about Bitcoin" → "What is Bitcoin?"
- Missing context: "compare" → "compare business models"

YOUR TASK:
Return the original query if it has specific entities or is already clear. Only enhance if truly vague.`;

export interface EnhancedPrompt {
  original: string;
  enhanced: string;
  wasImproved: boolean;
  improvementReason?: string;
}

/**
 * Enhance user prompt using Claude as a prompt engineer
 */
export async function enhancePrompt(
  userPrompt: string,
  role?: string,
  context?: {
    hasDocuments?: boolean;
    documentTopics?: string[];
    webSearchEnabled?: boolean;
  }
): Promise<EnhancedPrompt> {
  // NEVER enhance for web search - pass queries unchanged
  if (context?.webSearchEnabled) {
    return {
      original: userPrompt,
      enhanced: userPrompt,
      wasImproved: false,
      improvementReason: 'Web search - query sent unchanged'
    };
  }

  try {
    // Build context for the enhancer
    let contextInfo = '';
    if (context?.hasDocuments && context.documentTopics) {
      contextInfo = `\n\nAvailable context topics: ${context.documentTopics.join(', ')}`;
    }

    if (role) {
      contextInfo += `\nUser role: ${role}`;
    }

    const enhancementPrompt = `Original question: "${userPrompt}"${contextInfo}

Analyze this question and:
1. If it's unclear or too vague, improve it
2. If it's already clear and specific, keep it as is
3. Add relevant context markers if helpful
4. Keep the same language

Return ONLY a JSON object:
{
  "enhanced": "the improved question or original if no improvement needed",
  "wasImproved": true/false,
  "reason": "brief explanation"
}`;

    const response = await chatWithProvider('anthropic', {
      system: PROMPT_ENGINEER_SYSTEM,
      user: enhancementPrompt,
      maxTokens: 500
    });

    // Parse response
    let cleaned = response.trim();
    cleaned = cleaned.replace(/```json\s*/gi, '');
    cleaned = cleaned.replace(/```\s*/g, '');

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleaned);

    console.log('🎨 Prompt Enhancement:');
    console.log(`   Original: "${userPrompt}"`);
    console.log(`   Enhanced: "${parsed.enhanced}"`);
    console.log(`   Improved: ${parsed.wasImproved} - ${parsed.reason}`);

    return {
      original: userPrompt,
      enhanced: parsed.enhanced || userPrompt,
      wasImproved: parsed.wasImproved || false,
      improvementReason: parsed.reason
    };

  } catch (error) {
    console.error('Prompt enhancement failed:', error);
    // Fallback to original prompt
    return {
      original: userPrompt,
      enhanced: userPrompt,
      wasImproved: false,
      improvementReason: 'Enhancement failed, using original'
    };
  }
}

/**
 * Quick check if prompt needs enhancement
 */
export function shouldEnhancePrompt(prompt: string): boolean {
  // Don't enhance if already detailed
  if (prompt.length > 100) return false;

  // Check for vague patterns
  const vaguePatterns = [
    /^[а-яa-z]+$/i,  // Single word
    /^что|^how|^tell me$/i,  // Vague starters
    /дела|about$/i,  // Vague questions
  ];

  return vaguePatterns.some(pattern => pattern.test(prompt));
}
