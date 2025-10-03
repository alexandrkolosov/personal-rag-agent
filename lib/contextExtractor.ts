// lib/contextExtractor.ts
// Extract and suggest additional context for better search queries

import { chatWithProvider } from './modelProvider';

export interface ContextSuggestion {
  needsContext: boolean;
  suggestions: string[];
  extractedContext: {
    companies?: string[];
    locations?: string[];
    dates?: string[];
    identifiers?: string[];
  };
}

const CONTEXT_EXTRACTOR_PROMPT = `You are a context extraction expert. Analyze the user's question and identify what additional context would make searches more effective.

YOUR TASK:
1. Extract any specific entities already in the question (companies, locations, dates)
2. Identify what additional context would help narrow searches
3. Suggest specific questions to ask the user

RULES:
- Only suggest context that would SIGNIFICANTLY improve search specificity
- Don't ask for context that's already in the question
- Keep suggestions brief (1-2 words per item)
- Maximum 3 suggestions

EXAMPLES:

Question: "Compare the companies"
Output: {
  "needsContext": true,
  "suggestions": ["Which companies?", "What industry?", "What regions?"],
  "extractedContext": {}
}

Question: "Compare SwiftDrive and YoYo Mobility"
Output: {
  "needsContext": true,
  "suggestions": ["What aspects to compare?", "Specific region focus?"],
  "extractedContext": {
    "companies": ["SwiftDrive", "YoYo Mobility"]
  }
}

Question: "What are the latest trends?"
Output: {
  "needsContext": true,
  "suggestions": ["In which industry?", "Which geographic market?", "Time period?"],
  "extractedContext": {}
}

Question: "Compare SwiftDrive Russia operations with YoYo Mobility France operations for Q4 2024"
Output: {
  "needsContext": false,
  "suggestions": [],
  "extractedContext": {
    "companies": ["SwiftDrive", "YoYo Mobility"],
    "locations": ["Russia", "France"],
    "dates": ["Q4 2024"]
  }
}

Return ONLY valid JSON without markdown formatting.`;

export async function analyzeContextNeeds(
  question: string
): Promise<ContextSuggestion> {
  console.log('🔍 Analyzing context needs for:', question);

  const prompt = `${CONTEXT_EXTRACTOR_PROMPT}

USER QUESTION:
"${question}"

Analyze this question and return the JSON response.`;

  try {
    const response = await chatWithProvider('openai', {
      system: CONTEXT_EXTRACTOR_PROMPT,
      user: `USER QUESTION:\n"${question}"`,
      maxTokens: 300
    });

    // Clean response
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/g, '');
    }

    const result = JSON.parse(cleaned);
    console.log('📋 Context analysis:', result);

    return result;
  } catch (error) {
    console.error('Error analyzing context:', error);
    // Return default - assume no context needed
    return {
      needsContext: false,
      suggestions: [],
      extractedContext: {}
    };
  }
}

export function formatContextPrompt(suggestion: ContextSuggestion): string {
  if (!suggestion.needsContext || suggestion.suggestions.length === 0) {
    return '';
  }

  return `To provide better results, please clarify:\n${suggestion.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
}
