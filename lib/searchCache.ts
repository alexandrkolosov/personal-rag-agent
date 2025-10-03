// lib/searchCache.ts
// Simple in-memory cache with TTL for search results

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class SearchCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL: number = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor(ttlMs?: number) {
    if (ttlMs) {
      this.defaultTTL = ttlMs;
    }
  }

  /**
   * Generate cache key from query and options
   */
  private generateKey(query: string, options?: any): string {
    const normalized = query.toLowerCase().trim();
    const optionsStr = options ? JSON.stringify(options) : '';
    return `${normalized}::${optionsStr}`;
  }

  /**
   * Get cached result if exists and not expired
   */
  get(query: string, options?: any): any | null {
    const key = this.generateKey(query, options);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    console.log(`✅ Cache HIT for query: "${query.substring(0, 50)}..."`);
    return entry.data;
  }

  /**
   * Store result in cache
   */
  set(query: string, data: any, options?: any, ttlMs?: number): void {
    const key = this.generateKey(query, options);
    const ttl = ttlMs || this.defaultTTL;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });

    console.log(`💾 Cached result for query: "${query.substring(0, 50)}..." (TTL: ${ttl}ms)`);
  }

  /**
   * Clear expired entries (cleanup)
   */
  cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired cache entries`);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size
    };
  }
}

// Export singleton instance with 1 hour TTL
// IMPORTANT: Short TTL for web search because:
// 1. Web data changes frequently
// 2. Entity information updates regularly
// 3. Better to get fresh results than stale cache
// 4. 1 hour is enough to avoid duplicate queries in same session
export const searchCache = new SearchCache(60 * 60 * 1000); // 1 hour

// Auto cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    searchCache.cleanup();
  }, 10 * 60 * 1000);
}
