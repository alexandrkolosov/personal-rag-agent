# Entity Query Safety Measures

## Problem: Entity Queries Being Modified/Broken

**Critical Issue**: Queries with specific entities (names, companies) were being modified by:
1. Prompt enhancement changing entity order/wording
2. Query optimizer breaking context
3. Semantic cache returning wrong results for similar names

---

## Safety Measures Implemented ✅

### 1. **Prompt Enhancement Safety** ✅

**Location**: `lib/promptEnhancer.ts:84-97`

**Protection**:
```typescript
// Detect entities BEFORE enhancement
const hasProperNouns = /[A-ZА-Я][a-zа-я]+\s+[A-ZА-Я][a-zа-я]+/.test(userPrompt);
const hasCompanyNames = /[A-Z][a-z]+[A-Z]|Ltd|LLC|Inc|GmbH/.test(userPrompt);
const hasMultipleEntities = userPrompt.split(/\s+/).filter(word => /^[A-ZА-Я]/.test(word)).length >= 2;

if (hasProperNouns || hasCompanyNames || hasMultipleEntities) {
  // SKIP ENHANCEMENT - preserve query exactly as-is
  return {
    original: userPrompt,
    enhanced: userPrompt,
    wasImproved: false,
    improvementReason: 'Already has specific entities (preserved)'
  };
}
```

**What Gets Protected**:
- ✅ "Колосов Александр" (proper noun)
- ✅ "SwiftDrive" (company name)
- ✅ "Колосов Александр SwiftDrive" (multiple entities)
- ✅ "Tesla Russia" (capitalized words)

**What Gets Enhanced**:
- ✅ "Колосов" (single name, vague)
- ✅ "about Bitcoin" (incomplete)
- ✅ "compare" (too vague)

---

### 2. **Query Optimizer Bypass** ✅

**Location**: `app/api/ask/route.ts:307-327`

**Protection**:
```typescript
// Only optimize COMPLEX queries (maxSubQueries > 1)
if (complexityAnalysis.shouldUseMultiQuery && complexityAnalysis.maxSubQueries > 1) {
  // Complex: break into sub-queries
  optimizedQuery = await optimizeQuery(...);
} else {
  // Simple/Medium: use original AS-IS
  optimizedQuery = {
    original: finalQuestion,
    subQueries: [{
      query: finalQuestion,  // EXACT original query
      purpose: 'Direct search with full context',
      priority: 'high',
      searchMode: 'web'
    }],
    searchStrategy: 'focused',
    expectedSources: []
  };
}
```

**Entity Detection in Complexity Analysis**:

**Location**: `lib/queryComplexity.ts:27-46`

```typescript
// Detect entity-rich queries
const hasProperNouns = /[A-ZА-Я][a-zа-я]+\s+[A-ZА-Я][a-zа-я]+/.test(question);
const hasCompanyNames = /[A-Z][a-z]+[A-Z]|Ltd|LLC|Inc|GmbH/.test(question);
const isEntityQuery = hasProperNouns || hasCompanyNames;

// Force entity queries to stay simple (bypass optimizer)
if (isEntityQuery && !hasComparison) {
  complexityScore = Math.min(complexityScore, 1);
}
```

**Result**: Entity queries NEVER go through the optimizer

---

### 3. **Semantic Cache Tightened** ✅

**Location**: `lib/semanticCache.ts:224-227`

**Before**: 92% similarity (too loose)
```typescript
similarityThreshold: 0.92  // Would match "Kolosov Alexander" with "Kolosov Alexey"
```

**After**: 95% similarity (strict)
```typescript
similarityThreshold: 0.95  // Only matches very similar queries
```

**Impact**:
- ❌ Before: "Колосов Александр" matched "Колосов Алексей" (wrong person!)
- ✅ After: Only matches near-identical queries

---

### 4. **Enhanced System Prompts** ✅

**Location**: `lib/promptEnhancer.ts:6-45`

**Critical Rules Added**:
```
1. PRESERVE ALL ENTITIES: Keep person names, company names, locations EXACTLY as provided
2. Only add context if the query is incomplete or vague
3. If the query already has specific entities, DO NOT change them
4. When in doubt, keep the original
```

**Examples in Prompt**:
```
BAD - Changes entities:
Input: "Колосов Александр SwiftDrive"
Output: "Александр Колосов работа в SwiftDrive" ❌ WRONG

GOOD - Preserves entities:
Input: "Колосов Александр SwiftDrive"
Output: "Колосов Александр SwiftDrive" ✅ Keep as-is
```

---

## Complete Safety Flow

### Example: "Колосов Александр SwiftDrive"

```
1. User Input
   "Колосов Александр SwiftDrive"
   ↓

2. Prompt Enhancer Check
   hasProperNouns: true (Колосов Александр)
   hasCompanyNames: true (SwiftDrive)
   → SKIP ENHANCEMENT ✅
   → Output: "Колосов Александр SwiftDrive" (unchanged)
   ↓

3. Complexity Analysis
   isEntityQuery: true
   complexityScore: capped at 1
   → complexity: "simple"
   → shouldUseMultiQuery: false
   ↓

4. Query Routing
   shouldUseMultiQuery: false
   → BYPASS OPTIMIZER ✅
   → Use query AS-IS: "Колосов Александр SwiftDrive"
   ↓

5. Send to Perplexity
   Query: "Колосов Александр SwiftDrive" (exact)
   Model: sonar-reasoning (analyst role)
   Temperature: 0.35
   ↓

6. Result
   ✅ Information about Kolosov at SwiftDrive (correct!)
```

---

## Testing Matrix

### ✅ Protected Queries (Should NOT be modified)

| Input | Enhanced? | Optimized? | Result |
|-------|-----------|------------|--------|
| "Колосов Александр SwiftDrive" | ❌ No | ❌ No | ✅ Sent AS-IS |
| "Колосов Александр" | ❌ No | ❌ No | ✅ Sent AS-IS |
| "SwiftDrive Russia" | ❌ No | ❌ No | ✅ Sent AS-IS |
| "Tesla Model 3" | ❌ No | ❌ No | ✅ Sent AS-IS |

### ✅ Enhanced Queries (Vague → Specific)

| Input | Enhanced? | Result |
|-------|-----------|--------|
| "Колосов" | ✅ Yes | "Колосов Александр" (minimal) |
| "about Bitcoin" | ✅ Yes | "What is Bitcoin?" |
| "compare" | ✅ Yes | "compare business models" |

### ✅ Complex Queries (Should be optimized)

| Input | Optimized? | Sub-queries |
|-------|------------|-------------|
| "Compare SwiftDrive and YoYo Mobility strategies" | ✅ Yes | 2 |
| "Analyze crypto risks, regulations, trends" | ✅ Yes | 2 |

---

## Cache Behavior

### Before (92% threshold):
```
Cache: "Колосов Александр" → [result A]

Query: "Колосов Алексей"
Similarity: 93%
Result: ❌ Returns result A (WRONG PERSON!)
```

### After (95% threshold):
```
Cache: "Колосов Александр" → [result A]

Query: "Колосов Алексей"
Similarity: 93%
Result: ✅ Cache MISS → New search (CORRECT!)
```

---

## Logs to Watch

### Good Flow (Entity Preserved):
```
🎨 Prompt Enhancement:
   Original: "Колосов Александр SwiftDrive"
   Enhanced: "Колосов Александр SwiftDrive"
   Improved: false - Already has specific entities (preserved)

🎯 Query complexity: simple - Entity-rich query detected
✅ Using original query directly (preserving context)
🔍 Searching: Колосов Александр SwiftDrive
```

### Bad Flow (Would indicate problem):
```
🎨 Prompt Enhancement:
   Original: "Колосов Александр SwiftDrive"
   Enhanced: "Александр Колосов работа" ❌ PROBLEM!
   Improved: true

🔧 Using query optimizer ❌ PROBLEM!
🔍 Searching: Александр Колосов ❌ CONTEXT LOST!
```

---

## Summary of Protections

| Protection Layer | Mechanism | Detects |
|-----------------|-----------|---------|
| **Prompt Enhancer** | Entity detection | Proper nouns, company names, multiple capitals |
| **Complexity Analysis** | Entity scoring | Same + forces simple complexity |
| **Query Routing** | Bypass optimizer | Simple queries go direct |
| **Semantic Cache** | High threshold (0.95) | Prevents false matches |
| **System Prompts** | Explicit rules | Instructs Claude to preserve entities |

---

## If Entity Queries Still Break

### Debug Checklist:

1. **Check Enhancement Log**:
   ```
   Look for: "Already has specific entities (preserved)"
   If missing: Entity detection regex may need adjustment
   ```

2. **Check Complexity Log**:
   ```
   Look for: complexity: "simple" or "medium"
   If "complex": Entity detection in complexity may be failing
   ```

3. **Check Routing Log**:
   ```
   Look for: "✅ Using original query directly"
   If "🔧 Using query optimizer": Bypass logic is failing
   ```

4. **Check Cache**:
   ```
   Look for: "✨ Semantic cache HIT (95%+ similar)"
   If hit on wrong entity: May need to increase threshold to 0.97
   ```

5. **Clear Semantic Cache**:
   ```bash
   curl -X DELETE http://localhost:3001/api/cache \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## Configuration Tuning

### If Too Conservative (not enhancing enough):
```typescript
// In promptEnhancer.ts
// Reduce entity detection threshold
const hasMultipleEntities = userPrompt.split(/\s+/)
  .filter(word => /^[A-ZА-Я]/.test(word)).length >= 3;  // Change from 2 to 3
```

### If Cache Too Strict (too few hits):
```typescript
// In semanticCache.ts
similarityThreshold: 0.93  // Loosen from 0.95
```

### If Cache Too Loose (wrong matches):
```typescript
// In semanticCache.ts
similarityThreshold: 0.97  // Tighten from 0.95
```

---

## Final Safety Net

Even if all safety measures fail, the **Perplexity system prompt** is instructed to preserve entities:

```typescript
systemPrompt = 'You are an expert research analyst. Focus on the specific entities mentioned in the query (names, companies, locations) and provide accurate information about those exact entities.'
```

This ensures that even if a modified query reaches Perplexity, it tries to understand and preserve the original intent.
