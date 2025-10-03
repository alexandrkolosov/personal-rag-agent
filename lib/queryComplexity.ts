// lib/queryComplexity.ts
// Detect query complexity to optimize Perplexity API usage

export type QueryComplexity = 'simple' | 'medium' | 'complex';

export interface ComplexityAnalysis {
  complexity: QueryComplexity;
  reason: string;
  shouldUseMultiQuery: boolean;
  maxSubQueries: number;
}

/**
 * Analyze query complexity to determine search strategy
 */
export function analyzeQueryComplexity(question: string): ComplexityAnalysis {
  // ALWAYS return simple - no query optimization
  // Perplexity works best with unmodified queries
  return {
    complexity: 'simple',
    reason: 'Direct query - no optimization needed',
    shouldUseMultiQuery: false,
    maxSubQueries: 1
  };
}

/**
 * Estimate cost for a query based on complexity
 */
export function estimateQueryCost(complexity: QueryComplexity): {
  apiCalls: number;
  estimatedCostUSD: number;
} {
  // Perplexity pricing (approximate)
  const COST_PER_CALL = 0.005;  // $5 per 1000 requests

  const apiCalls = complexity === 'simple' ? 1 : complexity === 'medium' ? 1 : 2;

  return {
    apiCalls,
    estimatedCostUSD: apiCalls * COST_PER_CALL
  };
}

/**
 * Log cost savings
 */
export function logCostSavings(
  originalCalls: number,
  optimizedCalls: number
): void {
  const COST_PER_CALL = 0.005;
  const originalCost = originalCalls * COST_PER_CALL;
  const optimizedCost = optimizedCalls * COST_PER_CALL;
  const savings = originalCost - optimizedCost;
  const savingsPercent = ((savings / originalCost) * 100).toFixed(0);

  console.log(`💰 Cost optimization:`);
  console.log(`   Without optimization: ${originalCalls} calls ($${originalCost.toFixed(3)})`);
  console.log(`   With optimization: ${optimizedCalls} calls ($${optimizedCost.toFixed(3)})`);
  console.log(`   Savings: ${savingsPercent}% ($${savings.toFixed(3)})`);
}
