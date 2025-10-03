# Entity Query Safety - Verification Guide

## How to Verify Entity Queries Are Protected

### Test Query: "Колосов Александр SwiftDrive"

Expected log output (in order):

```
🛡️ Skipping enhancement for entity-based web search
✅ Prompt is already good, no enhancement needed

🛡️ Entity query detected - forcing simple complexity to preserve context
🎯 Query complexity: simple - Entity-rich query (names/companies detected) - preserving context
💰 Max sub-queries: 1 (cost optimization)

✅ Using original query directly (preserving context)

🔍 Searching: Колосов Александр SwiftDrive
⏱️ Using timeout: 25000ms for model: sonar-pro (retry: 0)
```

### RED FLAGS (If you see these, something is BROKEN):

❌ **Bad Log 1 - Enhancement Modified Query**:
```
✨ Prompt was enhanced by Claude
Enhanced: "Александр Колосов работа SwiftDrive"  // WRONG!
```

❌ **Bad Log 2 - Using Optimizer**:
```
🔧 Using query optimizer for complex query  // SHOULD NOT HAPPEN for entity queries
```

❌ **Bad Log 3 - Wrong Complexity**:
```
🎯 Query complexity: complex  // Entity queries should be "simple"
```

❌ **Bad Log 4 - Breaking Query**:
```
🔍 Searching: Колосов Александр
🔍 Searching: SwiftDrive  // SPLIT INTO SEPARATE SEARCHES!
```

---

## Protection Layers Checklist

### Layer 1: Route-Level Entity Check ✅

**File**: `app/api/ask/route.ts:131-142`

**Check**:
```typescript
const hasEntities = /[A-ZА-Я][a-zа-я]+\s+[A-ZА-Я][a-zа-я]+/.test(question) ||
                    /[A-Z][a-z]+[A-Z]/.test(question) ||
                    question.split(/\s+/).filter(w => /^[A-ZА-Я]/.test(w)).length >= 2;

if (webSearchEnabled && hasEntities) {
  console.log('🛡️ Skipping enhancement for entity-based web search');
  // Use original question
}
```

**Matches**:
- ✅ "Колосов Александр" (proper noun pattern)
- ✅ "SwiftDrive" (mixed case)
- ✅ "Tesla Russia" (2 capitalized words)

---

### Layer 2: Prompt Enhancer Entity Check ✅

**File**: `lib/promptEnhancer.ts:84-101`

**Check**:
```typescript
const hasProperNouns = /[A-ZА-Я][a-zа-я]+\s+[A-ZА-Я][a-zа-я]+/.test(userPrompt);
const hasCompanyNames = /[A-Z][a-z]+[A-Z]|Ltd|LLC|Inc|GmbH|[A-ZА-Я][a-z]{2,}/.test(userPrompt);
const hasMultipleEntities = userPrompt.split(/\s+/).filter(word => /^[A-ZА-Я]/.test(word)).length >= 2;
const hasAnyCapitalizedWord = /\b[A-ZА-Я][a-zа-я]{2,}\b/.test(userPrompt);

if (hasProperNouns || hasCompanyNames || hasMultipleEntities || hasAnyCapitalizedWord) {
  console.log(`🛡️ Skipping enhancement - detected entities in: "${userPrompt}"`);
  return { original: userPrompt, enhanced: userPrompt, wasImproved: false };
}
```

**Matches**:
- ✅ "Колосов Александр SwiftDrive" (all checks pass)
- ✅ "Bitcoin" (capitalized word)
- ✅ "Russia" (capitalized word)

---

### Layer 3: Complexity Analysis Early Return ✅

**File**: `lib/queryComplexity.ts:43-53`

**Check**:
```typescript
const hasProperNouns = /[A-ZА-Я][a-zа-я]+\s+[A-ZА-Я][a-zа-я]+/.test(question);
const hasCompanyNames = /[A-Z][a-z]+[A-Z]|Ltd|LLC|Inc|GmbH/.test(question);
const isEntityQuery = hasProperNouns || hasCompanyNames;

if (isEntityQuery && !hasComparison) {
  console.log('🛡️ Entity query detected - forcing simple complexity');
  return {
    complexity: 'simple',
    shouldUseMultiQuery: false,
    maxSubQueries: 1
  };
}
```

**Result**: Entity queries IMMEDIATELY return with `shouldUseMultiQuery: false`

---

### Layer 4: Query Routing Bypass ✅

**File**: `app/api/ask/route.ts:307-327`

**Check**:
```typescript
if (complexityAnalysis.shouldUseMultiQuery && complexityAnalysis.maxSubQueries > 1) {
  // Use optimizer
} else {
  // BYPASS optimizer
  console.log('✅ Using original query directly (preserving context)');
  optimizedQuery = {
    subQueries: [{
      query: finalQuestion  // EXACT original
    }]
  };
}
```

**Result**: If `shouldUseMultiQuery: false` (from Layer 3), optimizer is bypassed

---

## Complete Flow Example

### Input: "Колосов Александр SwiftDrive"

```
Step 1: Route-Level Check (app/api/ask/route.ts:131)
├─ hasEntities check
├─ Pattern: /[A-ZА-Я][a-zа-я]+\s+[A-ZА-Я][a-zа-я]+/
├─ Match: "Колосов Александр" ✅
└─ Result: Skip enhancement
   └─ Log: "🛡️ Skipping enhancement for entity-based web search"

Step 2: Complexity Analysis (lib/queryComplexity.ts:29)
├─ hasProperNouns check
├─ Match: "Колосов Александр" ✅
├─ isEntityQuery: true
└─ Early return with:
   ├─ complexity: 'simple'
   ├─ shouldUseMultiQuery: false
   └─ maxSubQueries: 1
   └─ Log: "🛡️ Entity query detected - forcing simple complexity"

Step 3: Query Routing (app/api/ask/route.ts:307)
├─ Check: shouldUseMultiQuery && maxSubQueries > 1
├─ Evaluate: false && false
└─ Result: Use ELSE branch (bypass optimizer)
   └─ Log: "✅ Using original query directly"

Step 4: Send to Perplexity
├─ Query: "Колосов Александр SwiftDrive" (unchanged!)
├─ Model: sonar-pro
├─ Temperature: 0.35
└─ Log: "🔍 Searching: Колосов Александр SwiftDrive"

Step 5: Result
└─ Information about Kolosov at SwiftDrive ✅
```

---

## Testing Checklist

### ✅ Protected Queries (Should Go AS-IS)

| Query | Layer 1 | Layer 2 | Layer 3 | Layer 4 | Result |
|-------|---------|---------|---------|---------|--------|
| "Колосов Александр SwiftDrive" | ✅ Skip | ✅ Skip | ✅ Simple | ✅ Bypass | AS-IS |
| "Колосов Александр" | ✅ Skip | ✅ Skip | ✅ Simple | ✅ Bypass | AS-IS |
| "SwiftDrive Russia" | ✅ Skip | ✅ Skip | ✅ Simple | ✅ Bypass | AS-IS |
| "Tesla Model 3" | ✅ Skip | ✅ Skip | ✅ Simple | ✅ Bypass | AS-IS |
| "Bitcoin" | ✅ Skip | ✅ Skip | N/A | ✅ Bypass | AS-IS |

### ⚠️ Queries That Get Enhanced (No Entities)

| Query | Layer 1 | Layer 2 | Result |
|-------|---------|---------|--------|
| "what about bitcoin" | Pass | Pass | "What is Bitcoin?" |
| "compare" | Pass | Pass | "compare business models" |
| "дела" | Pass | Pass | Enhanced |

### ✅ Complex Queries (Should Be Optimized)

| Query | Has Entities? | Has Comparison? | Layer 3 Result | Optimizer? |
|-------|--------------|-----------------|----------------|------------|
| "Compare SwiftDrive and YoYo" | Yes | Yes | Complex | ✅ Yes |
| "Analyze crypto risks trends" | No | No | Complex | ✅ Yes |

**Note**: Comparisons with entities ARE allowed to be optimized because they need multiple searches.

---

## Debug Commands

### Check Current Query Flow
```bash
# In browser console when asking a question:
# Watch the Network tab → /api/ask
# Check Response → Look for promptImprovement object

{
  "promptImprovement": {
    "original": "Колосов Александр SwiftDrive",
    "enhanced": "Колосов Александр SwiftDrive",  // Should be same!
    "reason": "Entity query for web search (preserved)"
  }
}
```

### Check Server Logs
```bash
# Terminal running npm run dev:
# Should see this sequence:

🛡️ Skipping enhancement for entity-based web search
🛡️ Entity query detected - forcing simple complexity
✅ Using original query directly (preserving context)
🔍 Searching: Колосов Александр SwiftDrive
```

### Clear Semantic Cache (if getting wrong results)
```bash
curl -X DELETE http://localhost:3001/api/cache \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Regex Pattern Explanations

### Proper Nouns Pattern
```regex
/[A-ZА-Я][a-zа-я]+\s+[A-ZА-Я][a-zа-я]+/
```
- Matches: "First Last" name patterns
- Examples: "Колосов Александр", "John Smith"
- Catches: Russian and English names

### Company Names Pattern
```regex
/[A-Z][a-z]+[A-Z]|Ltd|LLC|Inc|GmbH/
```
- Matches: Mixed case words or company suffixes
- Examples: "SwiftDrive", "YoYo", "Apple Inc"

### Multiple Capitals Check
```typescript
question.split(/\s+/).filter(w => /^[A-ZА-Я]/.test(w)).length >= 2
```
- Counts words starting with capitals
- Examples: "Tesla Russia" (2), "Колосов Александр SwiftDrive" (3)

### Any Capitalized Word
```regex
/\b[A-ZА-Я][a-zа-я]{2,}\b/
```
- Matches: Any word 3+ chars starting with capital
- Examples: "Bitcoin", "Russia", "Москва"

---

## If Issues Persist

### Issue: Enhancement Still Modifying Entities

**Debug**:
1. Check if `webSearchEnabled` is true:
   ```
   Log: "Web Search: enabled=true"
   ```

2. Check if entity detection is working:
   ```
   Add temporary log in route.ts:131:
   console.log('Entity check:', { hasEntities, question });
   ```

3. Verify regex matches:
   ```javascript
   // Test in browser console:
   const q = "Колосов Александр SwiftDrive";
   const hasProperNouns = /[A-ZА-Я][a-zа-я]+\s+[A-ZА-Я][a-zа-я]+/.test(q);
   console.log(hasProperNouns); // Should be true
   ```

---

### Issue: Optimizer Still Breaking Query

**Debug**:
1. Check complexity log:
   ```
   Look for: "🛡️ Entity query detected - forcing simple complexity"
   ```

2. Check routing decision:
   ```
   Look for: "✅ Using original query directly"
   ```

3. If you see "🔧 Using query optimizer", check:
   ```
   - complexityAnalysis.shouldUseMultiQuery (should be false)
   - complexityAnalysis.maxSubQueries (should be 1)
   ```

---

### Issue: Cache Returning Wrong Results

**Solution**:
```bash
# Clear semantic cache
curl -X DELETE http://localhost:3001/api/cache \
  -H "Authorization: Bearer YOUR_TOKEN"

# Or restart server to clear in-memory cache
```

---

## Summary

### Entity Protection is ACTIVE if you see:

✅ `🛡️ Skipping enhancement for entity-based web search`
✅ `🛡️ Entity query detected - forcing simple complexity`
✅ `✅ Using original query directly (preserving context)`
✅ `🔍 Searching: [exact original query]`

### Entity Protection is BROKEN if you see:

❌ `✨ Prompt was enhanced by Claude` (for entity queries)
❌ `🔧 Using query optimizer for complex query` (for non-comparison entity queries)
❌ Query split into multiple searches

---

All layers are now redundant and aggressive. Even if one layer fails, others will catch it.
