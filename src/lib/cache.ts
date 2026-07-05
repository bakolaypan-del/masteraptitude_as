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

// Fetch cached collection data or fall back to Firestore query
export async function getCachedCollection<T>(
  key: string,
  fetchFn: () => Promise<T[]>,
  cacheField: string
): Promise<T[]> {
  try {
    const cacheState = await getCacheState();
    const currentVersion = cacheState[cacheField];
    
    if (!currentVersion) {
      return await fetchFn();
    }
    
    const cachedData = localStorage.getItem(`ma_cache_${key}`);
    const cachedVer = localStorage.getItem(`ma_cache_ver_${key}`);
    
    if (cachedData && cachedVer === String(currentVersion)) {
      return JSON.parse(cachedData) as T[];
    }
    
    // Fetch fresh and update cache
    const fresh = await fetchFn();
    localStorage.setItem(`ma_cache_${key}`, JSON.stringify(fresh));
    localStorage.setItem(`ma_cache_ver_${key}`, String(currentVersion));
    return fresh;
  } catch (error) {
    console.warn(`[Cache] Error loading cached collection ${key}:`, error);
    return await fetchFn();
  }
}
