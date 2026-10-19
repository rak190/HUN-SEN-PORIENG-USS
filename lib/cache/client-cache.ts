/**
 * Hun Sen Porieng USS — Scoped Client Data Cache
 * Memory-only, zero-trust caching layer for Next.js App Router & Supabase.
 *
 * Guarantees:
 * 1. Zero cross-account / cross-role / cross-class leakage (structured canonical keys).
 * 2. Memory-only (heap Map; never persisted to localStorage or IndexedDB).
 * 3. In-flight request coalescing (prevents duplicate simultaneous HTTPS queries).
 * 4. Monotonic epoch/sequence guards (prevents slow stale responses from overwriting newer selections).
 * 5. Fail-closed error handling (errors are rethrown to caller, never cached as empty results).
 * 6. Pub/Sub notification for mounted React consumers on invalidation.
 * 7. Bounded LRU eviction (max 100 entries).
 * 8. Complete cache purging on logout or user switch.
 */

export interface CacheKeyOptions {
  userId?: string | null;
  role?: string | null;
  schoolId?: string | null;
  academicYearId?: string | null;
  classId?: string | null;
  resource: string;
  params?: Record<string, any> | string | null;
}

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  ttlMs: number;
  epoch: number;
  lastAccessed: number;
}

export interface GetOrFetchOptions {
  ttlMs?: number;
  forceRefresh?: boolean;
  allowStale?: boolean;
}

export interface CacheResult<T> {
  data: T;
  isCached: boolean;
  isStale?: boolean;
}

// Module-level in-memory stores (heap only)
const MAX_CACHE_ENTRIES = 100;
const cacheStore = new Map<string, CacheEntry<any>>();
const inFlightMap = new Map<string, Promise<any>>();
const epochMap = new Map<string, number>();
const listenerMap = new Map<string, Set<() => void>>();

/**
 * Builds a canonical, structured cache key ensuring strict tenant, user,
 * academic year, class, and resource isolation.
 */
export function buildCacheKey(options: CacheKeyOptions): string {
  const u = options.userId || 'anon';
  const r = options.role || 'guest';
  const s = options.schoolId || '_';
  const y = options.academicYearId || '_';
  const c = options.classId || '_';
  const res = options.resource;

  let p = '_';
  if (options.params) {
    if (typeof options.params === 'string') {
      p = options.params;
    } else {
      const paramsObj = options.params as Record<string, any>;
      const sortedKeys = Object.keys(paramsObj).sort();
      p = sortedKeys
        .map((k) => `${k}=${paramsObj[k] ?? ''}`)
        .join('&');
    }
  }

  return `u:${u}|r:${r}|s:${s}|y:${y}|c:${c}|res:${res}|p:${p}`;
}

/**
 * Evicts least-recently-accessed entry if cache capacity is exceeded.
 */
function evictLRUIfNeeded() {
  if (cacheStore.size < MAX_CACHE_ENTRIES) return;

  let oldestKey: string | null = null;
  let oldestAccess = Infinity;

  for (const [key, entry] of cacheStore.entries()) {
    if (entry.lastAccessed < oldestAccess) {
      oldestAccess = entry.lastAccessed;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    cacheStore.delete(oldestKey);
  }
}

/**
 * Stores a value in memory with LRU bounds checking.
 */
function setCacheEntry<T>(key: string, data: T, ttlMs: number, epoch: number) {
  evictLRUIfNeeded();
  cacheStore.set(key, {
    key,
    data,
    timestamp: Date.now(),
    ttlMs,
    epoch,
    lastAccessed: Date.now(),
  });
}

/**
 * Notifies mounted subscribers when a key or pattern changes.
 */
function notifySubscribers(pattern: string) {
  for (const [subPattern, callbacks] of listenerMap.entries()) {
    if (subPattern === '*' || pattern.includes(subPattern) || subPattern.includes(pattern)) {
      callbacks.forEach((cb) => {
        try {
          cb();
        } catch (e) {
          console.error('[ClientCache] Error in subscriber callback:', e);
        }
      });
    }
  }
}

/**
 * Core query function with SWR, concurrent deduplication, and epoch race guards.
 */
export async function getOrFetchScoped<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: GetOrFetchOptions = {}
): Promise<CacheResult<T>> {
  const ttlMs = options.ttlMs ?? 120_000; // default 2 minutes
  const forceRefresh = Boolean(options.forceRefresh);
  const allowStale = options.allowStale !== false;

  const now = Date.now();
  const existing = cacheStore.get(key);

  if (existing && !forceRefresh) {
    existing.lastAccessed = now;
    const isStale = now - existing.timestamp > existing.ttlMs;

    if (!isStale) {
      return { data: existing.data, isCached: true, isStale: false };
    }

    if (allowStale) {
      // Trigger background revalidation if not already in-flight
      if (!inFlightMap.has(key)) {
        revalidateInBackground(key, fetcher, ttlMs);
      }
      return { data: existing.data, isCached: true, isStale: true };
    }
  }

  // Check in-flight deduplication
  const existingPromise = inFlightMap.get(key);
  if (existingPromise) {
    const data = await existingPromise;
    return { data, isCached: true };
  }

  // Cold fetch: initiate with monotonic epoch tracking
  const currentEpoch = (epochMap.get(key) || 0) + 1;
  epochMap.set(key, currentEpoch);

  const fetchPromise = (async () => {
    try {
      const data = await fetcher();

      // Epoch guard: ensure key was not invalidated or replaced while fetch was in flight
      if (epochMap.get(key) === currentEpoch) {
        setCacheEntry(key, data, ttlMs, currentEpoch);
      }
      return data;
    } finally {
      inFlightMap.delete(key);
    }
  })();

  inFlightMap.set(key, fetchPromise);
  const data = await fetchPromise;
  return { data, isCached: false };
}

/**
 * Internal helper for SWR background revalidation.
 */
async function revalidateInBackground<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number
) {
  const currentEpoch = (epochMap.get(key) || 0) + 1;
  epochMap.set(key, currentEpoch);

  const fetchPromise = (async () => {
    try {
      const data = await fetcher();
      if (epochMap.get(key) === currentEpoch) {
        setCacheEntry(key, data, ttlMs, currentEpoch);
        notifySubscribers(key);
      }
      return data;
    } catch (err) {
      // Do not overwrite existing cache with error, but log
      console.warn('[ClientCache] Background revalidation failed for', key, err);
    } finally {
      inFlightMap.delete(key);
    }
  })();

  inFlightMap.set(key, fetchPromise);
}

/**
 * Invalidates any cached entry matching the given pattern substring.
 * Also increments epoch to discard any pending in-flight requests.
 */
export function invalidateCachePattern(pattern: string) {
  let matched = false;
  for (const key of Array.from(cacheStore.keys())) {
    if (key.includes(pattern)) {
      cacheStore.delete(key);
      epochMap.set(key, (epochMap.get(key) || 0) + 1);
      matched = true;
    }
  }

  for (const key of Array.from(inFlightMap.keys())) {
    if (key.includes(pattern)) {
      inFlightMap.delete(key);
      epochMap.set(key, (epochMap.get(key) || 0) + 1);
      matched = true;
    }
  }

  notifySubscribers(pattern);
  return matched;
}

/**
 * Invalidates a specific exact cache key.
 */
export function invalidateCacheKey(key: string) {
  cacheStore.delete(key);
  inFlightMap.delete(key);
  epochMap.set(key, (epochMap.get(key) || 0) + 1);
  notifySubscribers(key);
}

/**
 * Subscribes a callback to cache changes matching pattern.
 * Returns an unsubscription function.
 */
export function subscribe(pattern: string, callback: () => void): () => void {
  let listeners = listenerMap.get(pattern);
  if (!listeners) {
    listeners = new Set();
    listenerMap.set(pattern, listeners);
  }
  listeners.add(callback);

  return () => {
    listeners?.delete(callback);
    if (listeners?.size === 0) {
      listenerMap.delete(pattern);
    }
  };
}

/**
 * Completely purges all memory caches, in-flight promises, and epochs.
 * MUST be invoked on user logout or account switching.
 */
export function clearAllClientCaches() {
  cacheStore.clear();
  inFlightMap.clear();
  epochMap.clear();
  notifySubscribers('*');
}

// -------------------------------------------------------------
// Domain-Specific Invalidation Helpers
// -------------------------------------------------------------

export function invalidateClassRoster(classId: string) {
  invalidateCachePattern(`c:${classId}|res:roster`);
}

export function invalidateClassAttendance(classId: string, month?: string) {
  const pattern = month
    ? `c:${classId}|res:attendance|p:month=${month}`
    : `c:${classId}|res:attendance`;
  invalidateCachePattern(pattern);
}

export function invalidateClassGrades(classId: string, period?: string) {
  const pattern = period
    ? `c:${classId}|res:grades|p:period=${period}`
    : `c:${classId}|res:grades`;
  invalidateCachePattern(pattern);
}

export function invalidateParentContacts(classId: string) {
  invalidateCachePattern(`c:${classId}|res:parent_contacts`);
}

/**
 * Student transfer invalidator: strictly purges BOTH source and destination classes!
 */
export function invalidateDualClassTransfer(sourceClassId: string, destClassId: string) {
  invalidateClassRoster(sourceClassId);
  invalidateClassRoster(destClassId);
}

// -------------------------------------------------------------
// Introspection & Diagnostics (for tests & benchmarks)
// -------------------------------------------------------------

export function getCacheMetrics() {
  return {
    size: cacheStore.size,
    inFlightCount: inFlightMap.size,
    keys: Array.from(cacheStore.keys()),
  };
}
