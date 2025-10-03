// lib/semanticCache.ts
// Semantic caching using query embeddings for similar query detection

import OpenAI from 'openai';

interface CachedEntry {
  query: string;
  vector: number[];
  result: any;
  timestamp: number;
  accessCount: number;
}

export class SemanticCache {
  private cache: Map<string, CachedEntry> = new Map();
  private openai: OpenAI;
  private similarityThreshold: number;
  private maxCacheSize: number;
  private ttl: number;

  constructor(config?: {
    similarityThreshold?: number;
    maxCacheSize?: number;
    ttl?: number;
  }) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.similarityThreshold = config?.similarityThreshold || 0.95; // 95% similarity (stricter)
    this.maxCacheSize = config?.maxCacheSize || 1000; // Max 1000 entries
    this.ttl = config?.ttl || 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Try to find semantically similar cached result
   */
  async get(query: string): Promise<any | null> {
    try {
      // Get embedding for the query
      const queryEmbedding = await this.getEmbedding(query);

      // Find most similar cached query
      let maxSimilarity = 0;
      let bestMatch: CachedEntry | null = null;
      let bestMatchKey: string | null = null;

      for (const [key, cached] of this.cache.entries()) {
        // Check if entry expired
        if (Date.now() - cached.timestamp > this.ttl) {
          this.cache.delete(key);
          continue;
        }

        const similarity = this.cosineSimilarity(queryEmbedding, cached.vector);

        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          bestMatch = cached;
          bestMatchKey = key;
        }
      }

      // If similarity above threshold, return cached result
      if (bestMatch && maxSimilarity >= this.similarityThreshold) {
        // Update access count
        bestMatch.accessCount++;

        console.log(`✨ Semantic cache HIT (${(maxSimilarity * 100).toFixed(1)}% similar to "${bestMatch.query.substring(0, 50)}...")`);

        return bestMatch.result;
      }

      console.log(`❌ Semantic cache MISS (best match: ${(maxSimilarity * 100).toFixed(1)}%)`);
      return null;
    } catch (error) {
      console.error('Semantic cache get error:', error);
      return null; // Fail gracefully
    }
  }

  /**
   * Store query result with its embedding
   */
  async set(query: string, result: any): Promise<void> {
    try {
      // Check cache size limit
      if (this.cache.size >= this.maxCacheSize) {
        this.evictLeastUsed();
      }

      const embedding = await this.getEmbedding(query);
      const key = this.generateKey(query);

      this.cache.set(key, {
        query,
        vector: embedding,
        result,
        timestamp: Date.now(),
        accessCount: 1
      });

      console.log(`💾 Semantic cache SET: "${query.substring(0, 50)}..." (${this.cache.size}/${this.maxCacheSize})`);
    } catch (error) {
      console.error('Semantic cache set error:', error);
      // Fail gracefully
    }
  }

  /**
   * Get embedding for text using OpenAI
   */
  private async getEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 500), // Truncate for speed and cost
      dimensions: 256 // Use smaller dimensions for faster similarity computation
    });

    return response.data[0].embedding;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Generate cache key from query
   */
  private generateKey(query: string): string {
    return query.toLowerCase().trim();
  }

  /**
   * Evict least recently used entries
   */
  private evictLeastUsed(): void {
    let minAccessCount = Infinity;
    let lruKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < minAccessCount) {
        minAccessCount = entry.accessCount;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      console.log(`🗑️ Semantic cache evicted LRU entry (access count: ${minAccessCount})`);
    }
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let evictedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        evictedCount++;
      }
    }

    if (evictedCount > 0) {
      console.log(`🧹 Semantic cache cleaned up ${evictedCount} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  stats(): {
    size: number;
    maxSize: number;
    utilizationPercent: number;
    avgAccessCount: number;
  } {
    let totalAccessCount = 0;
    for (const entry of this.cache.values()) {
      totalAccessCount += entry.accessCount;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      utilizationPercent: (this.cache.size / this.maxCacheSize) * 100,
      avgAccessCount: this.cache.size > 0 ? totalAccessCount / this.cache.size : 0
    };
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️ Semantic cache cleared');
  }
}

// Export singleton instance
export const semanticCache = new SemanticCache({
  similarityThreshold: 0.95,  // 95% similarity threshold (stricter to avoid false matches)
  maxCacheSize: 1000,         // Store up to 1000 queries
  ttl: 24 * 60 * 60 * 1000   // 24 hour TTL
});

// Auto cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    semanticCache.cleanup();
  }, 60 * 60 * 1000);
}
