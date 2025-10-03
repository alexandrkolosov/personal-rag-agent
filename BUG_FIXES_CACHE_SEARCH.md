# Critical Bug Fixes - Cache & Search Issues

## Problems Identified

### 🔴 Critical Issue #1: Semantic Cache Returning Stale/Wrong Results
**Problem**: Semantic cache was matching queries at 95% similarity and returning cached results for different entities.

**Example**:
- Query: "Колосов Александр SwiftDrive"
- Cache hit: Old result for "Колосов Алексей" (different person!)
- Result: Irrelevant information shown to user

**Root Cause**:
- Semantic cache checked for EVERY web search (line 62 in perplexity.ts)
- 95% similarity too loose for entity queries
- Web data changes frequently - cached results become stale
- Different entities with similar names matched incorrectly

---

### 🔴 Critical Issue #2: Object Serialization Error `[object Object]`
**Problem**: Browser trying to fetch `GET /[object%20Object] 404`

**Example**:
```javascript
// BROKEN CODE:
src={img.url || img}
// If img is object without .url, becomes: src="[object Object]"
```

**Root Cause**:
- MessageItem component didn't validate image URL format
- Perplexity might return images in different formats
- No type checking before using as URL

---

### 🔴 Critical Issue #3: Exact Cache TTL Too Long (24 hours)
**Problem**: Web search results cached for 24 hours - too long for dynamic data.

**Example**:
- Monday 9am: Query "Колосов Александр SwiftDrive" → Cache result
- Tuesday 9am: Same query → Return Monday's stale data
- Problem: Company info, positions, news change daily!

**Root Cause**:
- searchCache initialized with 24 hour TTL
- "Cost optimization" prioritized over data freshness
- No way to force fresh results

---

## Solutions Implemented

### ✅ Fix #1: Disable Semantic Cache for Web Searches

**File**: `lib/perplexity.ts`

**Changes**:
```typescript
// BEFORE: Always checked semantic cache
const semanticCached = await semanticCache.get(query);
if (semanticCached) {
    return semanticCached; // WRONG - returns stale results!
}

// AFTER: Skip semantic cache entirely for web searches
async search(query: string, options?: SearchOptions) {
    // LAYER 1: Check exact match cache ONLY
    if (this.useCache) {
        const cached = searchCache.get(query, cacheKey);
        if (cached) {
            console.log('✅ Exact cache HIT');
            return cached;
        }
    }

    console.log('❌ Cache MISS - fetching fresh results');

    // SKIP LAYER 2 (Semantic Cache) - disabled for web searches
    // Reason: Web data changes, entity queries need fresh results

    // LAYER 3: Fetch from Perplexity
    const result = await executeSearch(...);

    // Store in EXACT cache only (not semantic)
    searchCache.set(query, result, cacheKey);

    return result;
}
```

**Why This Works**:
- Exact cache requires EXACT query match (safe)
- No similarity matching = no wrong entities
- Semantic cache only used for document search now
- Web search always gets fresh or exact-match results

---

### ✅ Fix #2: Validate Image URLs Before Rendering

**File**: `app/components/MessageItem.tsx`

**Changes**:
```typescript
// BEFORE: Dangerous - could pass object as URL
<img src={img.url || img} />

// AFTER: Validate and extract URL safely
{msg.webImages.map((img: any, i: number) => {
    // Handle different formats
    const imageUrl = typeof img === 'string'
        ? img
        : (img?.url || img?.imageUrl || null);

    // Skip if no valid URL
    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
        return null;
    }

    return (
        <img
            src={imageUrl}
            alt={img.alt || img.description || `Image ${i+1}`}
            onError={(e) => { e.target.style.display = 'none'; }}
        />
    );
})}
```

**Why This Works**:
- Type checking before using as URL
- Handles multiple Perplexity response formats
- Gracefully skips invalid images
- No more `[object Object]` errors

---

### ✅ Fix #3: Reduce Cache TTL to 1 Hour

**File**: `lib/searchCache.ts`

**Changes**:
```typescript
// BEFORE: 24 hour TTL
export const searchCache = new SearchCache(24 * 60 * 60 * 1000);

// AFTER: 1 hour TTL
export const searchCache = new SearchCache(60 * 60 * 1000);
```

**Why This Works**:
- 1 hour is enough to avoid duplicate queries in same session
- Fresh enough for daily changing data
- Still provides cost savings (avoids API calls for repeated queries)
- Balance between freshness and performance

---

### ✅ Bonus: Cache Clear API Endpoint

**New File**: `app/api/cache/clear/route.ts`

**Usage**:
```bash
# Clear all caches (for testing)
curl -X POST http://localhost:3001/api/cache/clear

# Get cache statistics
curl http://localhost:3001/api/cache/clear
```

**Response**:
```json
{
  "success": true,
  "message": "All caches cleared successfully"
}
```

**Why This Helps**:
- Easy testing without restarting server
- Debug cache-related issues
- Force fresh results when needed

---

## Testing Checklist

### Test 1: Verify No Semantic Cache for Web Search
```bash
# First query - should fetch from Perplexity
Query: "Колосов Александр SwiftDrive"

Expected logs:
❌ Cache MISS - fetching fresh results
🔍 Searching: Колосов Александр SwiftDrive
✅ Perplexity response received
💾 Cached result for query: "Колосов Александр SwiftDrive..." (TTL: 3600000ms)

# Exact same query - should use exact cache
Query: "Колосов Александр SwiftDrive"

Expected logs:
✅ Exact cache HIT - returning cached result

# Similar query - should NOT use semantic cache
Query: "Колосов Александр работа SwiftDrive"

Expected logs:
❌ Cache MISS - fetching fresh results
(NOT: ✨ Semantic cache HIT)
```

### Test 2: Verify Image URLs Work
```bash
# Query with images
Query: "Tesla Cybertruck images"

Expected:
- Images render correctly (no broken images)
- No browser errors about [object Object]
- Invalid image URLs gracefully skipped
```

### Test 3: Verify Cache Expiration
```bash
# Query once
Query: "Latest AI news"

# Wait 30 minutes - should still be cached
Query: "Latest AI news"
Expected: ✅ Exact cache HIT

# Wait another 40 minutes (total 70min > 60min TTL)
Query: "Latest AI news"
Expected: ❌ Cache MISS (expired, fetching fresh)
```

### Test 4: Verify Cache Clear API
```bash
# Clear cache
curl -X POST http://localhost:3001/api/cache/clear

# Next query should be fresh
Query: "Any previously cached query"
Expected: ❌ Cache MISS
```

---

## Impact Summary

### Before Fixes:
- ❌ Semantic cache returning wrong entities (95% similarity)
- ❌ Image URLs breaking with [object Object] errors
- ❌ 24 hour cache = stale results for changing data
- ❌ No way to force fresh results
- ❌ Users getting irrelevant information

### After Fixes:
- ✅ Only exact cache used (safe, precise)
- ✅ Image URLs validated and safe
- ✅ 1 hour cache (fresh yet performant)
- ✅ Cache clear API for testing
- ✅ Users get accurate, fresh results

---

## Performance Impact

### API Calls:
- **Before**: Same query = instant (but might be wrong entity!)
- **After**: Same query = instant (exact match only)
- **Different similar query**: Fresh API call (no wrong matches)

### Cache Hit Rates:
- **Exact cache**: Still works (same query in 1 hour window)
- **Semantic cache**: Disabled for web search (prevented bad matches)
- **Overall**: Slight decrease in cache hits, but MUCH better quality

### Cost:
- **Small increase**: More API calls for similar queries
- **Trade-off**: Accuracy > cost savings
- **Mitigation**: 1 hour exact cache still saves on duplicates

---

## Remaining Considerations

### Future Optimizations:
1. **Selective semantic cache**: Could enable for non-entity queries
2. **Cache warming**: Pre-cache common queries
3. **Smart TTL**: Longer cache for stable data (company info) vs news
4. **User override**: Allow "force refresh" button

### Monitoring:
- Track cache hit/miss rates
- Monitor API costs vs quality
- Watch for any new [object Object] errors
- Verify entity query accuracy

---

## Summary

**Three critical bugs fixed:**

1. **Semantic cache disabled for web search** → No more wrong entities
2. **Image URL validation** → No more [object Object] errors
3. **Cache TTL reduced to 1 hour** → Fresh, relevant results

**Key Insight**: **Quality > Performance**. It's better to make a few extra API calls than to return stale or wrong information.

**Next Steps**: Test with actual entity queries to verify results are now accurate and fresh.
