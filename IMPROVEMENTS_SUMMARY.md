# Recent Improvements Summary

## Issue 1: Perplexity API Timeout Errors ✅

### Problem
- `HeadersTimeoutError: Headers Timeout Error` (code: UND_ERR_HEADERS_TIMEOUT)
- API calls timing out due to slow response times

### Solution
**File: `lib/perplexity.ts`**

1. **Added 30-second timeout** with AbortController
2. **Graceful timeout handling** with clear error messages
3. **Automatic cleanup** of timeout timers

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

// Fetch with signal
const response = await fetch(url, { signal: controller.signal });

// Handle timeout
if (fetchError.name === 'AbortError') {
  throw new Error('Perplexity API request timeout after 30 seconds...');
}
```

**Benefits:**
- Prevents indefinite hanging
- Clear error messages for users
- Proper resource cleanup
- 30-second max wait time

---

## Issue 2: Over-Engineering in Sub-Query Generation ✅

### Problem
- System generating 5+ broad, generic sub-queries
- Missing specific context (company names, locations, dates)
- Example: Asking about "SwiftDrive vs YoYo Mobility" but generating queries like "electric vehicle market"

### Solution

#### A. Updated Query Optimizer Prompt (`lib/queryOptimizer.ts`)

**Before:**
```
Generate 3-5 DIFFERENT sub-queries
- "electric vehicle market"
- "mobility companies"
- "transportation trends"
```

**After:**
```
Generate 2-3 FOCUSED sub-queries with context
- "SwiftDrive business model Russia 2024"
- "YoYo Mobility France operations OTK"
```

**Key Changes:**
1. **Reduced from 5+ to 2-3 queries** - more focused
2. **Context extraction rules** - must include:
   - Company names mentioned
   - Locations mentioned
   - Dates/periods mentioned
   - Specific identifiers
3. **Examples showing good vs bad** queries

#### B. Enhanced Clarification System (`lib/prompt.ts`)

Added intelligent context questions when user query is vague:

**New Clarifications:**
```typescript
// For comparisons without specific entities
if (!hasSpecificEntities) {
  ask: "Какие конкретно компании/объекты сравнить?"
}

// For queries without geographic context
if (!hasLocation) {
  ask: "В каком регионе/стране? (опционально)"
}
```

**Benefits:**
- System asks user for context BEFORE generating sub-queries
- User provides: "SwiftDrive, YoYo Mobility, Russia, France"
- Sub-queries become specific and targeted

#### C. Context Enrichment in Optimizer (`lib/queryOptimizer.ts`)

New parameter `additionalContext`:
```typescript
export async function optimizeQuery(
  userQuery: string,
  role?: string,
  documentContext?: any[],
  additionalContext?: Record<string, string>  // NEW
)
```

Context is injected into AI prompt:
```
ADDITIONAL CONTEXT PROVIDED BY USER:
comparison_entities: SwiftDrive, YoYo Mobility
geographic_scope: Russia, France

USE THIS CONTEXT IN YOUR SUB-QUERIES!
```

---

## How It Works Now

### Example Flow:

**1. User asks vague question:**
```
"Compare the companies"
```

**2. System detects missing context:**
```
⚠️ Clarification needed:
- Which companies to compare?
- What region/country?
```

**3. User provides context:**
```
Companies: SwiftDrive, YoYo Mobility
Region: Russia, France
```

**4. System generates targeted sub-queries:**
```
✅ Query 1: "SwiftDrive Russia operations 2024"
✅ Query 2: "YoYo Mobility France business model"
(2 queries instead of 5)
```

**5. Search results are specific and relevant**

---

## Configuration

### Timeout Duration
In `lib/perplexity.ts`:
```typescript
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds
```

### Sub-Query Count
In `lib/queryOptimizer.ts`:
```typescript
CRITICAL RULES:
1. Generate 2-3 FOCUSED sub-queries (not 5+ broad ones)
```

---

## Performance Impact

**Before:**
- ❌ 5+ broad queries per search
- ❌ Generic results ("electric vehicle market")
- ❌ Timeouts with no clear errors
- ❌ Poor search specificity

**After:**
- ✅ 2-3 focused queries per search
- ✅ Specific results with context
- ✅ 30s timeout with clear messages
- ✅ High search specificity

---

## Examples

### Bad (Before):
```
User: "Compare SwiftDrive and YoYo"

Generated queries:
1. "electric vehicle companies"
2. "mobility market trends"
3. "transportation startups"
4. "vehicle sharing platforms"
5. "automotive industry analysis"
```

### Good (After):
```
User: "Compare SwiftDrive and YoYo"

System asks:
- Which regions? → Russia, France
- What aspects? → Business model, operations

Generated queries:
1. "SwiftDrive Russia business model 2024"
2. "YoYo Mobility France operations"
```

---

## Technical Details

### Files Changed:
1. **lib/perplexity.ts** - Added timeout handling
2. **lib/queryOptimizer.ts** - Improved prompt, reduced queries, added context param
3. **lib/prompt.ts** - Enhanced clarification questions for context
4. **app/api/ask/route.ts** - Pass clarification answers to optimizer

### New Features:
- Timeout with AbortController
- Context-aware clarifications
- Sub-query enrichment with user context
- Better examples in prompts

### Dependencies:
- No new dependencies added
- Uses existing clarification system
- Compatible with current caching/throttling

---

## Testing Recommendations

1. **Test timeout handling:**
   - Intentionally slow API responses
   - Verify 30s timeout works
   - Check error messages are clear

2. **Test context extraction:**
   - Try vague queries: "compare companies"
   - Verify clarification questions appear
   - Check sub-queries include provided context

3. **Test sub-query quality:**
   - Monitor console logs for generated queries
   - Verify 2-3 queries (not 5+)
   - Check queries include specific context
