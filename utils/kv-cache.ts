// Deno KV-based caching layer for price data
// Much faster than PostgreSQL for caching, especially on Deno Deploy

let kv: Deno.Kv | null = null;

/**
 * Get or initialize the Deno KV instance
 * On Deno Deploy, this automatically connects to the distributed KV store
 */
async function getKv(): Promise<Deno.Kv> {
  if (!kv) {
    kv = await Deno.openKv();
  }
  return kv;
}

/**
 * Get a cached price from Deno KV
 * Returns null if not found or expired
 */
export async function getCachedPrice(cacheKey: string): Promise<number | null> {
  try {
    const db = await getKv();
    const result = await db.get<number>(["price_cache", cacheKey]);
    
    // KV automatically handles expiration via TTL
    return result.value;
  } catch (error) {
    console.error("Failed to get cached price from KV:", error);
    return null;
  }
}

/**
 * Set a cached price in Deno KV with automatic expiration
 * @param cacheKey - The cache key
 * @param price - The price value
 * @param expirationHours - How long to cache (default 1 hour)
 */
export async function setCachedPrice(
  cacheKey: string, 
  price: number, 
  expirationHours = 1
): Promise<boolean> {
  try {
    const db = await getKv();
    const expiresIn = Math.floor(expirationHours * 60 * 60 * 1000); // Convert to milliseconds
    
    await db.set(["price_cache", cacheKey], price, { expireIn: expiresIn });
    
    return true;
  } catch (error) {
    console.error("Failed to cache price in KV:", error);
    return false;
  }
}

/**
 * Delete a specific cache entry
 */
export async function deleteCachedPrice(cacheKey: string): Promise<boolean> {
  try {
    const db = await getKv();
    await db.delete(["price_cache", cacheKey]);
    return true;
  } catch (error) {
    console.error("Failed to delete cached price from KV:", error);
    return false;
  }
}

/**
 * Get cache statistics (useful for monitoring)
 */
export async function getCacheStats(): Promise<{ totalEntries: number }> {
  try {
    const db = await getKv();
    let totalEntries = 0;
    
    // List all cache entries to count them
    const entries = db.list({ prefix: ["price_cache"] });
    for await (const _entry of entries) {
      totalEntries++;
    }
    
    return { totalEntries };
  } catch (error) {
    console.error("Failed to get cache stats:", error);
    return { totalEntries: 0 };
  }
}

/**
 * Clear all cache entries (use with caution!)
 */
export async function clearAllCache(): Promise<boolean> {
  try {
    const db = await getKv();
    const entries = db.list({ prefix: ["price_cache"] });
    
    for await (const entry of entries) {
      await db.delete(entry.key);
    }
    
    return true;
  } catch (error) {
    console.error("Failed to clear cache:", error);
    return false;
  }
}

/**
 * Get multiple cached prices in one operation (batch read)
 * Much more efficient than individual reads
 */
export async function getCachedPrices(cacheKeys: string[]): Promise<Map<string, number>> {
  const results = new Map<string, number>();
  
  try {
    const db = await getKv();
    const keys = cacheKeys.map(key => ["price_cache", key]);
    const values = await db.getMany<number[]>(keys);
    
    values.forEach((result, index) => {
      if (result.value !== null) {
        results.set(cacheKeys[index], result.value);
      }
    });
    
    return results;
  } catch (error) {
    console.error("Failed to get batch cached prices from KV:", error);
    return results;
  }
}

/**
 * Set multiple cached prices in one operation (batch write)
 * Much more efficient than individual writes
 */
export async function setCachedPrices(
  entries: Array<{ cacheKey: string; price: number; expirationHours?: number }>
): Promise<boolean> {
  try {
    const db = await getKv();
    
    // Use atomic operation for batch writes
    let atomic = db.atomic();
    
    for (const entry of entries) {
      const expiresIn = Math.floor((entry.expirationHours || 1) * 60 * 60 * 1000);
      atomic = atomic.set(
        ["price_cache", entry.cacheKey], 
        entry.price, 
        { expireIn: expiresIn }
      );
    }
    
    const result = await atomic.commit();
    return result.ok;
  } catch (error) {
    console.error("Failed to batch cache prices in KV:", error);
    return false;
  }
}
