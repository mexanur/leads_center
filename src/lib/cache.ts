type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();

  /**
   * Get a cached value or compute and store it if expired / missing
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && existing.expiresAt > now) {
      return existing.data;
    }

    const data = await fetcher();
    this.set(key, data, ttlSeconds);
    return data;
  }

  get<T>(key: string): T | null {
    const existing = this.store.get(key);
    if (!existing) return null;
    if (existing.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return existing.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or pattern (e.g. "stats", "bootstrap", "users")
   */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}

const globalForCache = global as unknown as { serverCache?: MemoryCache };

export const serverCache = globalForCache.serverCache || new MemoryCache();

if (!globalForCache.serverCache) {
  globalForCache.serverCache = serverCache;
}

export default serverCache;
