# Perplexity API Cost Reduction Strategies

## Current Cost Analysis

### Problem Identified
**Multi-query optimization is tripling your Perplexity costs:**

- **Before:** 1 API call per user question
- **Now:** 2-3 API calls per question (sub-queries)
- **Cost multiplier:** 2-3x higher costs 💸

### Example
User asks: "Compare companies"
```
Old: 1 search → $0.005
New: 3 sub-queries → $0.015
Cost increase: 200%
```

---

## Cost Reduction Strategies

### Strategy 1: Smart Query Routing ⭐ RECOMMENDED

**Concept:** Only use multi-query for complex questions

**Implementation:**
```typescript
// Simple question (1 concept) → Single search
"What is Bitcoin?" → 1 API call

// Complex question (multiple concepts) → Multi-query
"Compare Bitcoin vs Ethereum market trends and regulations" → 2-3 API calls
```

**Savings:** ~60-70% cost reduction

---

### Strategy 2: Aggressive Caching 💾

**Current:** 1 hour cache TTL
**Proposed:** Increase to 24 hours for stable queries

**Savings:** ~40-50% on repeated queries

---

### Strategy 3: Reduce Sub-Query Count

**Current:** 2-3 sub-queries per question
**Proposed:** 1-2 sub-queries maximum

**Savings:** ~33% immediate reduction

---

### Strategy 4: Document-First Approach

**Concept:** Only use Perplexity when documents insufficient

```typescript
if (documentQuality > 0.7) {
  // Use documents only → $0
} else {
  // Use Perplexity → $0.005
}
```

**Savings:** ~50-60% for users with good documents

---

### Strategy 5: Batch Similar Queries

**Concept:** Combine similar sub-queries into one

**Example:**
```
Instead of:
- "SwiftDrive Russia 2024"
- "SwiftDrive business model"
→ "SwiftDrive Russia business model 2024" (1 query)

Savings: 50% on similar queries
```

---

## Recommended Implementation Plan

### Phase 1: Quick Wins (Implement Now)

#### A. Add Query Complexity Detection
```typescript
function estimateQueryComplexity(question: string): 'simple' | 'medium' | 'complex' {
  const concepts = extractConcepts(question);
  const wordCount = question.split(' ').length;

  if (concepts.length <= 1 && wordCount <= 10) return 'simple';
  if (concepts.length <= 2 && wordCount <= 20) return 'medium';
  return 'complex';
}

// Route accordingly:
simple → 1 search (no optimization)
medium → 1-2 searches
complex → 2-3 searches
```

**Savings: ~60%**

#### B. Reduce Sub-Queries to 1-2 Max
```typescript
// In lib/queryOptimizer.ts
CRITICAL RULES:
1. Generate 1-2 FOCUSED sub-queries (not 2-3)
```

**Savings: ~33%**

#### C. Increase Cache TTL
```typescript
// In lib/searchCache.ts
export const searchCache = new SearchCache(
  24 * 60 * 60 * 1000  // 24 hours instead of 1 hour
);
```

**Savings: ~30-40% on repeated queries**

---

### Phase 2: Advanced Optimization

#### D. Document Quality Threshold
```typescript
const avgDocumentSimilarity = chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length;

if (avgDocumentSimilarity > 0.75 && chunks.length > 5) {
  console.log('High quality documents - skipping web search');
  webSearchEnabled = false;  // Don't use Perplexity
}
```

**Savings: ~50% for users with good documents**

#### E. User Budget Limits
```typescript
// Track usage per user per day
const dailyUsage = await getUserPerplexityUsage(userId, today);

if (dailyUsage > DAILY_LIMIT) {
  console.warn('User reached daily Perplexity limit');
  // Fallback to document-only search
}
```

**Savings: Prevents runaway costs**

---

## Cost Comparison

| Strategy | Current Cost | After Optimization | Savings |
|----------|-------------|-------------------|---------|
| Multi-query (current) | $0.015/question | - | Baseline |
| + Complexity routing | $0.015 | $0.007 | 53% |
| + Reduce to 1-2 queries | $0.015 | $0.010 | 33% |
| + Better caching | $0.015 | $0.009 | 40% |
| + Document-first | $0.015 | $0.007 | 53% |
| **ALL COMBINED** | **$0.015** | **$0.003** | **80%** |

---

## Implementation Priority

### Immediate (Today):
1. ✅ Reduce sub-queries to 1-2 max
2. ✅ Add query complexity routing
3. ✅ Increase cache TTL to 24 hours

**Expected savings: 60-70%**

### Short-term (This Week):
4. Add document quality threshold
5. Implement query deduplication

**Additional savings: 20-30%**

### Long-term (Optional):
6. Add user budget limits
7. Implement batch query combining

**Risk prevention + edge case optimization**

---

## Quality Impact Assessment

### High Quality Maintained ✅
- Simple queries: Same quality (1 search vs 1 sub-query)
- Complex queries: Same quality (still uses multi-query)
- Caching: Exact same results

### Slight Trade-offs ⚠️
- Very complex questions: Fewer sub-queries (2 instead of 3)
  - Impact: 10-15% less comprehensive
  - Benefit: 33% cost savings

### No Impact on Core Features ✅
- Document search: Unchanged
- AI synthesis: Unchanged
- User experience: Unchanged

---

## Monitoring

### Add Usage Tracking
```typescript
// Track costs per user
interface PerplexityUsage {
  userId: string;
  date: string;
  queryCount: number;
  estimatedCost: number;
}
```

### Console Logs
```
💰 Cost savings today:
  - Questions asked: 50
  - Queries without optimization: 150
  - Queries with optimization: 60
  - Savings: 60% ($0.45 saved)
```

---

## Quick Implementation Code

I'll implement the top 3 strategies now for immediate 60-70% savings.
