// lib/requestThrottler.ts
// Request throttling and rate limiting for API calls

import pLimit from 'p-limit';

interface ThrottlerConfig {
  maxConcurrent?: number;
  minDelay?: number; // Minimum delay between requests in ms
}

class RequestThrottler {
  private limiter: ReturnType<typeof pLimit>;
  private lastRequestTime: number = 0;
  private minDelay: number;

  constructor(config?: ThrottlerConfig) {
    // Max 2 concurrent requests to Perplexity
    this.limiter = pLimit(config?.maxConcurrent || 2);
    // Minimum 1 second between requests
    this.minDelay = config?.minDelay || 1000;
  }

  /**
   * Execute a function with throttling
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter(async () => {
      // Calculate delay needed
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.minDelay) {
        const delayNeeded = this.minDelay - timeSinceLastRequest;
        console.log(`⏱️ Throttling: waiting ${delayNeeded}ms before next request...`);
        await this.delay(delayNeeded);
      }

      // Update last request time
      this.lastRequestTime = Date.now();

      // Execute the function
      try {
        const result = await fn();
        return result;
      } catch (error) {
        // If rate limited, add exponential backoff
        if (error instanceof Error && error.message.includes('rate limit')) {
          console.log('⚠️ Rate limited, implementing exponential backoff...');
          await this.delay(this.minDelay * 2); // Wait 2x longer
          throw error;
        }
        throw error;
      }
    });
  }

  /**
   * Simple delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue size
   */
  get queueSize(): number {
    return this.limiter.pendingCount;
  }

  /**
   * Get active requests count
   */
  get activeCount(): number {
    return this.limiter.activeCount;
  }
}

// Export singleton instances for different services
export const perplexityThrottler = new RequestThrottler({
  maxConcurrent: 2,    // Max 2 concurrent Perplexity requests
  minDelay: 1000       // 1 second between requests
});

export const openaiThrottler = new RequestThrottler({
  maxConcurrent: 5,    // OpenAI has higher limits
  minDelay: 100        // 100ms between requests
});
