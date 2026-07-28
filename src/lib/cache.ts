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

// Fetch fresh real-time data directly from database on every load
export async function getCachedCollection<T>(
  key: string,
  fetchFn: () => Promise<T[]>,
  _cacheField?: string
): Promise<T[]> {
  try {
    const fresh = await fetchFn();
    try {
      localStorage.setItem(`ma_cache_${key}`, JSON.stringify(fresh));
      localStorage.setItem(`ma_cache_ts_${key}`, String(Date.now()));
    } catch {}
    return fresh;
  } catch (error) {
    console.warn(`[RealTime] Fetch error for ${key}, checking offline cache fallback:`, error);
    const offlineCache = localStorage.getItem(`ma_cache_${key}`);
    if (offlineCache) {
      try { return JSON.parse(offlineCache) as T[]; } catch {}
    }
    return await fetchFn();
  }
}
