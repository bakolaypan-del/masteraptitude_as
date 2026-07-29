import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

let cacheStatePromise: Promise<any> | null = null;
let lastCacheStateFetch = 0;

// Fetch /settings/cache_state once and reuse promise for concurrent dashboard queries
export async function getCacheState(): Promise<any> {
  const now = Date.now();
  if (cacheStatePromise && (now - lastCacheStateFetch < 5000)) {
    return cacheStatePromise;
  }
  
  lastCacheStateFetch = now;
  cacheStatePromise = getDoc(doc(db, 'settings', 'cache_state'))
    .then(snap => {
      if (snap.exists()) {
        return snap.data();
      } else {
        // If it doesn't exist, seed it
        const initial = {
          notes: Date.now(),
          videos: Date.now(),
          pyqs: Date.now(),
          patterns: Date.now(),
          affairs: Date.now(),
          practice_sets: Date.now(),
          carousel: Date.now(),
          tests: Date.now(),
          categories: Date.now(),
          sitemap_updated_at: Date.now()
        };
        setDoc(doc(db, 'settings', 'cache_state'), initial).catch(() => {});
        return initial;
      }
    })
    .catch(err => {
      console.warn("[Cache] Failed to fetch cache state:", err);
      return {};
    });
    
  return cacheStatePromise;
}

// Invalidate cache version on Firestore
export async function invalidateCacheField(field: string): Promise<void> {
  try {
    const ref = doc(db, 'settings', 'cache_state');
    await updateDoc(ref, {
      [field]: Date.now(),
      sitemap_updated_at: Date.now() // Always trigger sitemap rebuild
    });
  } catch (err) {
    console.warn(`[Cache] Failed to invalidate cache for ${field}:`, err);
  }
}

// Stale-While-Revalidate: Instant UI render from cache + silent background refresh
export async function getCachedCollection<T>(
  key: string,
  fetchFn: () => Promise<T[]>,
  _cacheField?: string
): Promise<T[]> {
  const cachedStr = localStorage.getItem(`ma_cache_${key}`);
  const cachedTs = localStorage.getItem(`ma_cache_ts_${key}`);
  const cacheAgeLimit = 24 * 60 * 60 * 1000; // 24 hours

  let cachedData: T[] | null = null;
  if (cachedStr) {
    try {
      cachedData = JSON.parse(cachedStr) as T[];
    } catch {
      localStorage.removeItem(`ma_cache_${key}`);
    }
  }

  const revalidate = async (): Promise<T[]> => {
    try {
      const fresh = await fetchFn();
      if (fresh && Array.isArray(fresh)) {
        localStorage.setItem(`ma_cache_${key}`, JSON.stringify(fresh));
        localStorage.setItem(`ma_cache_ts_${key}`, String(Date.now()));
      }
      return fresh;
    } catch (err) {
      console.warn(`[SWR Cache] Background revalidation failed for ${key}:`, err);
      return cachedData || [];
    }
  };

  // Return cached data immediately if available for 0ms render, and revalidate in background
  if (cachedData && Array.isArray(cachedData) && cachedData.length > 0 && cachedTs && (Date.now() - Number(cachedTs) < cacheAgeLimit)) {
    revalidate().catch(() => {});
    return cachedData;
  }

  return await revalidate();
}
